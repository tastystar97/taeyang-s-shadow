import test from "node:test";
import assert from "node:assert/strict";
import { normalizeAccessCode, validateCode } from "../netlify/lib/auth.mjs";

test("access codes ignore accidental surrounding whitespace", () => {
  const previous = process.env.CONTROL_ACCESS_CODE;
  process.env.CONTROL_ACCESS_CODE = "  vb8r2t  ";
  try {
    assert.equal(validateCode("gm", "vb8r2t"), true);
    assert.equal(validateCode("gm", "  vb8r2t  "), true);
  } finally {
    if (previous === undefined) delete process.env.CONTROL_ACCESS_CODE;
    else process.env.CONTROL_ACCESS_CODE = previous;
  }
});

test("access codes tolerate quotes copied into an environment value", () => {
  const previous = process.env.CONTROL_ACCESS_CODE;
  process.env.CONTROL_ACCESS_CODE = '"vb8r2t"';
  try {
    assert.equal(validateCode("gm", "vb8r2t"), true);
    assert.equal(normalizeAccessCode("  'vb8r2t'  "), "vb8r2t");
  } finally {
    if (previous === undefined) delete process.env.CONTROL_ACCESS_CODE;
    else process.env.CONTROL_ACCESS_CODE = previous;
  }
});

test("access codes remain case-sensitive", () => {
  const previous = process.env.CONTROL_ACCESS_CODE;
  process.env.CONTROL_ACCESS_CODE = "vb8r2t";
  try {
    assert.equal(validateCode("gm", "VB8R2T"), false);
  } finally {
    if (previous === undefined) delete process.env.CONTROL_ACCESS_CODE;
    else process.env.CONTROL_ACCESS_CODE = previous;
  }
});
