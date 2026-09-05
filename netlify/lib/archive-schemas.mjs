export const ARCHIVE_SCHEMAS = {
  "hq-urgent": {
    "code": "HQ RESPONSE / DIRECTOR",
    "title": "지부장 회신 기록",
    "mode": "hq",
    "fields": [
      {
        "id": "decision",
        "label": "회신 결정",
        "type": "select",
        "options": [
          "본부 인계 협의",
          "지부 보호 지속",
          "P-07 인계 유예"
        ]
      },
      {
        "id": "responseAt",
        "label": "회신 일시",
        "type": "datetime-local"
      },
      {
        "id": "opinion",
        "label": "지부장 의견",
        "type": "textarea",
        "full": true
      },
      {
        "id": "nextAction",
        "label": "후속 조치 및 재검 일정",
        "type": "textarea",
        "full": true
      }
    ],
    "signatures": [
      {
        "id": "branchDirector",
        "label": "지부장 서명",
        "target": ".reason",
        "asset": true
      }
    ]
  },
  "medical-isea": {
    "code": "MEDICAL FOLLOW-UP",
    "title": "추가 의료 경과 기록",
    "mount": ".sign",
    "fields": [
      {
        "id": "observedAt",
        "label": "관찰 일시",
        "type": "datetime-local"
      },
      {
        "id": "condition",
        "label": "현재 판정",
        "type": "select",
        "options": [
          "의무 관찰",
          "안정",
          "현장 투입 보류",
          "추가 검사 필요",
          "격리 관찰"
        ]
      },
      {
        "id": "vitals",
        "label": "활력·침식 수치",
        "placeholder": "활력, 침식률, 특이 변화"
      },
      {
        "id": "observations",
        "label": "추가 관찰 소견",
        "type": "textarea",
        "full": true
      },
      {
        "id": "treatment",
        "label": "처치 및 투입 제한",
        "type": "textarea",
        "full": true
      }
    ],
    "signatures": [
      {
        "id": "medicalOfficer",
        "label": "의무 담당자 서명",
        "target": ".sign .sig:nth-child(1)"
      },
      {
        "id": "branchDirector",
        "label": "지부장 확인",
        "target": ".sign .sig:nth-child(2)",
        "asset": true
      }
    ]
  },
  "sera-profile": {
    "code": "PROTECTION DECISION",
    "title": "임시 보호 결정 기록",
    "mount": ".signatures",
    "fields": [
      {
        "id": "placement",
        "label": "처우 선택",
        "type": "select",
        "options": [
          "지부 숙소 보호",
          "UGN 본부 인계",
          "외부 협력처 보호",
          "임시 은폐"
        ]
      },
      {
        "id": "resources",
        "label": "시설·자원 배정",
        "type": "textarea",
        "full": true
      },
      {
        "id": "reason",
        "label": "결정 사유",
        "type": "textarea",
        "full": true
      }
    ],
    "signatures": [
      {
        "id": "protectionOfficer",
        "label": "보호 담당자 서명",
        "target": ".signatures .sig:nth-child(1)"
      },
      {
        "id": "medicalOfficer",
        "label": "의무 담당자 서명",
        "target": ".signatures .sig:nth-child(2)"
      },
      {
        "id": "branchDirector",
        "label": "지부장 결정·서명",
        "target": ".signatures .sig:nth-child(3)",
        "asset": true
      }
    ]
  },
  "suhwan-card": {
    "code": "TEMPORARY ID ISSUE",
    "title": "임시 신원 카드 발급 기록",
    "mount": ".signatures",
    "fields": [
      {
        "id": "issuedAt",
        "label": "발급 일자",
        "type": "date"
      },
      {
        "id": "housing",
        "label": "현재 보호처"
      },
      {
        "id": "medicalNote",
        "label": "의료 확인 내용",
        "type": "textarea",
        "full": true
      },
      {
        "id": "issueNote",
        "label": "발급 및 보호 메모",
        "type": "textarea",
        "full": true
      }
    ],
    "signatures": [
      {
        "id": "protectionOfficer",
        "label": "보호 담당자 서명",
        "target": ".signatures .sig:nth-child(1)"
      },
      {
        "id": "medicalOfficer",
        "label": "의료 확인 서명",
        "target": ".signatures .sig:nth-child(2)"
      },
      {
        "id": "branchDirector",
        "label": "지부장 승인 서명",
        "target": ".signatures .sig:nth-child(3)",
        "asset": true
      }
    ]
  },
  "handover": {
    "code": "HANDOVER ACCEPTANCE",
    "title": "인수 확인 기록",
    "mount": ".sign",
    "fields": [
      {
        "id": "acceptedAt",
        "label": "인수 일시",
        "type": "datetime-local"
      },
      {
        "id": "exceptions",
        "label": "인수 제외·유보 사항",
        "type": "textarea",
        "full": true
      },
      {
        "id": "notes",
        "label": "추가 인수 메모",
        "type": "textarea",
        "full": true
      }
    ],
    "signatures": [
      {
        "id": "incomingDirector",
        "label": "인수자 서명",
        "target": ".sign .box:nth-child(1)",
        "asset": true
      }
    ]
  }
};
