import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  clearSessionCookie,
  createSession,
  getSession,
  normalizeAccessCode,
  authConfigured,
  requireSession,
  resolvePlayerRole,
  sessionCookie,
  validateCode,
} from "../netlify/lib/auth.mjs";

function withEnv(changes, run) {
  const snapshot = Object.fromEntries(Object.keys(changes).map((key) => [key, process.env[key]]));

  Object.entries(changes).forEach(([key, value]) => {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  });

  try {
    return run();
  } finally {
    Object.entries(snapshot).forEach(([key, value]) => {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    });
  }
}

function requestWithCookie(cookie) {
  const headers = {};
  if (cookie) {
    headers.cookie = cookie;
  }
  return new Request("https://example.com/api/auth", { headers });
}

test("access codes ignore accidental surrounding whitespace", () => {
  withEnv({ SESSION_SECRET: "s", BRANCH_ACCESS_CODE: "  vb8r2t  ", FIELD_ACCESS_CODE: "fie-1", CONTROL_ACCESS_CODE: "gm-1" }, () => {
    assert.equal(validateCode("director", "vb8r2t"), true);
    assert.equal(validateCode("director", "  vb8r2t  "), true);
  });
});

test("access codes tolerate quotes copied into an environment value", () => {
  withEnv({
    SESSION_SECRET: "s",
    BRANCH_ACCESS_CODE: '"vb8r2t"',
    FIELD_ACCESS_CODE: "fie-1",
    CONTROL_ACCESS_CODE: "gm-1",
  }, () => {
    assert.equal(validateCode("director", "vb8r2t"), true);
    assert.equal(normalizeAccessCode('  "vb8r2t"  '), "vb8r2t");
  });
});

test("access codes remain case-sensitive", () => {
  withEnv({
    SESSION_SECRET: "s",
    BRANCH_ACCESS_CODE: "vb8r2t",
    FIELD_ACCESS_CODE: "fie-1",
    CONTROL_ACCESS_CODE: "gm-1",
  }, () => {
    assert.equal(validateCode("director", "VB8R2T"), false);
  });
});

test("missing auth env values are fail-closed", () => {
  withEnv({
    SESSION_SECRET: "s",
    BRANCH_ACCESS_CODE: "director",
    FIELD_ACCESS_CODE: undefined,
    CONTROL_ACCESS_CODE: "gm",
  }, () => {
    assert.equal(authConfigured(), false);
    assert.equal(validateCode("director", "director"), false);
    assert.equal(resolvePlayerRole("director"), null);
    assert.equal(createSession("director"), null);
  });
});

test("중복된 코드 설정은 인증을 막아야 한다", () => {
  withEnv(
    {
      SESSION_SECRET: "s",
      BRANCH_ACCESS_CODE: "dup",
      FIELD_ACCESS_CODE: "dup",
      CONTROL_ACCESS_CODE: "gm-1",
    },
    () => {
      assert.equal(authConfigured(), false);
      assert.equal(validateCode("director", "dup"), false);
      assert.equal(validateCode("agent", "dup"), false);
      assert.equal(resolvePlayerRole("dup"), null);
    },
  );
});

test("requireSession accepts exact role and default all players", () => {
  withEnv(
    {
      SESSION_SECRET: "s",
      BRANCH_ACCESS_CODE: "director",
      FIELD_ACCESS_CODE: "agent",
      CONTROL_ACCESS_CODE: "gm",
    },
    () => {
      const token = createSession("director");
      const cookie = sessionCookie(token, new Request("https://example.com/api/auth"));
      const request = requestWithCookie(cookie);

      assert.equal(requireSession(request)?.role, "director");
      assert.equal(requireSession(request, "director")?.role, "director");
      assert.equal(requireSession(request, "player"), null);
      assert.equal(requireSession(request, "agent"), null);
    },
  );
});

test("legacy player session format is rejected", () => {
  withEnv(
    {
      SESSION_SECRET: "s",
      BRANCH_ACCESS_CODE: "director",
      FIELD_ACCESS_CODE: "agent",
      CONTROL_ACCESS_CODE: "gm",
    },
    () => {
      const payload = Buffer.from(
        JSON.stringify({
          role: "player",
          exp: Date.now() + 1000 * 60 * 10,
          v: "legacy",
        }),
        "utf8",
      ).toString("base64url");
      const signature = createHmac("sha256", process.env.SESSION_SECRET).update(payload).digest("base64url");
      const request = requestWithCookie(`${payload}.${signature}`);

      assert.equal(getSession(request), null);
    },
  );
});

test("session is invalidated when code changes", () => {
  withEnv(
    {
      SESSION_SECRET: "s",
      BRANCH_ACCESS_CODE: "director-v1",
      FIELD_ACCESS_CODE: "agent",
      CONTROL_ACCESS_CODE: "gm",
    },
    () => {
      const token = createSession("director");
      const cookie = sessionCookie(token, new Request("https://example.com/api/auth"));
      const before = requestWithCookie(cookie);
      assert.equal(requireSession(before, "director")?.role, "director");

      withEnv(
        {
          SESSION_SECRET: "s",
          BRANCH_ACCESS_CODE: "director-v2",
          FIELD_ACCESS_CODE: "agent",
          CONTROL_ACCESS_CODE: "gm",
        },
        () => {
          assert.equal(requireSession(before, "director"), null);
        },
      );
    },
  );
});

test("malformed cookie never throws and becomes unauthenticated", () => {
  withEnv(
    {
      SESSION_SECRET: "s",
      BRANCH_ACCESS_CODE: "director",
      FIELD_ACCESS_CODE: "agent",
      CONTROL_ACCESS_CODE: "gm",
    },
    () => {
      const request = requestWithCookie("tcb_session=%");
      assert.equal(getSession(request), null);
      assert.equal(requireSession(request, "director"), null);
      assert.equal(clearSessionCookie(new Request("https://example.com/api/auth")).includes("Max-Age=0"), true);
    },
  );
});