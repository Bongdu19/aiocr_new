/**
 * llm_assistant.js
 * 신용장 무역 서류 검증 화면용 Gemini LLM 정밀 질의응답 어시스턴트 모듈
 * 
 * 주요 기능:
 * 1. Upstage AI-OCR 결과 JSON 정제 (위치좌표/Bounding Box/Coords 재귀적 제거)
 * 2. 서류 스키마 파싱 규칙 및 원본 서류 중심 시스템 프롬프트 자동 구성
 * 3. Gemini 무료 API 호출 (gemini-3.5-flash-lite, gemini-flash-latest 등 지원)
 * 4. 결과 마크다운 표(Table) 및 Mermaid 다이어그램 시각화 렌더링
 * 5. 기본 폴딩(접힘) UI 및 추천 질문 바로가기 칩 지원
 */

(function () {
  "use strict";

  // 기본 설정 (인메모리 전용, 로컬 스토리지에 절대 저장하지 않음)
  var DEFAULT_API_KEY = (typeof atob === "function")
    ? atob("QVEuQWI4Uk42STJ2ZjJVTmRjT2JXN2RBS0xuZE9yY2djYUxZWmUyMEY3cFBteTh6aWUybXc=")
    : "";
  var DEFAULT_MODEL = "gemini-3.5-flash-lite";

  // 현재 캐시된 원본 OCR 데이터 및 최근 생성된 마크다운 결과 (메모리 전용)
  var currentPayloadRef = null;
  var isGenerating = false;
  var lastGeneratedRawText = "";

  // DOM 요소 캐시
  var dom = {};

  // 초기화 함수
  function init() {
    cacheDomElements();
    if (!dom.container) return; // inspect.html이 아니면 종료

    // 기존 저장된 로컬스토리지 데이터가 있다면 완전 삭제 (보안 및 순수 인메모리 보장)
    try {
      localStorage.removeItem("aiocr_gemini_api_key");
      localStorage.removeItem("aiocr_gemini_model");
    } catch (e) {}

    // 기본값 설정 (메모리 DOM 상에만 세팅)
    if (dom.modelSelect) {
      dom.modelSelect.value = DEFAULT_MODEL;
    }

    bindEvents();
    initMermaid();

    // 혹시 이미 app.js에서 currentRawPayload가 존재하는 경우 즉시 반영
    if (window.currentRawPayload) {
      updateLlmAssistantContext(window.currentRawPayload);
    }
  }

  // DOM 캐싱
  function cacheDomElements() {
    dom.container = document.getElementById("llmChatDetails");
    dom.statusBadge = document.getElementById("llmDocStatusBadge");
    dom.modelSelect = document.getElementById("llmModelSelect");
    dom.questionInput = document.getElementById("llmQuestionInput");
    dom.sendBtn = document.getElementById("llmSendBtn");
    dom.clearChatBtn = document.getElementById("llmClearChatBtn");
    dom.previewContextBtn = document.getElementById("llmPreviewContextBtn");
    dom.previewDetails = document.getElementById("llmContextPreviewDetails");
    dom.previewContent = document.getElementById("llmContextPreviewContent");
    dom.responseWrapper = document.getElementById("llmResponseWrapper");
    dom.loadingSpinner = document.getElementById("llmLoadingSpinner");
    dom.responseContent = document.getElementById("llmResponseContent");
    dom.modelUsedBadge = document.getElementById("llmModelUsedBadge");
    dom.copyResponseBtn = document.getElementById("llmCopyResponseBtn");
    dom.downloadResponseBtn = document.getElementById("llmDownloadResponseBtn");
    dom.quickChips = document.querySelectorAll(".quick-chip-btn");
  }

  // Mermaid 초기화
  function initMermaid() {
    if (window.mermaid) {
      try {
        var isDark = document.documentElement.getAttribute("data-theme") === "dark";
        mermaid.initialize({
          startOnLoad: false,
          theme: isDark ? "dark" : "default",
          securityLevel: "loose",
          suppressErrorRendering: true, // 에러 발생 시 라이브러리의 흉측한 기본 에러 SVG를 무단 렌더링하지 않도록 방지
          flowchart: { useMaxWidth: true, htmlLabels: true, curve: "basis" }
        });
      } catch (e) {
        console.warn("[LLM] Mermaid 초기화 실패:", e);
      }
    }
  }

  // 이벤트 바인딩
  function bindEvents() {
    // [Gemini에게 질문하기] 버튼 클릭 시에만 명시적으로 API 호출
    if (dom.sendBtn) {
      dom.sendBtn.addEventListener("click", handleSendQuestion);
    }

    // 엔터키 처리: 일반 Enter는 자연스러운 줄바꿈(개행), Ctrl+Enter(또는 Cmd+Enter) 시에만 질문 전송
    if (dom.questionInput) {
      dom.questionInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          handleSendQuestion();
        }
      });
    }

    // 추천 질문 바로가기 칩 클릭: 질문창에 텍스트만 채워넣고 대기 (즉시 전송 안 함)
    if (dom.quickChips && dom.quickChips.length > 0) {
      dom.quickChips.forEach(function (chip) {
        chip.addEventListener("click", function () {
          var question = chip.getAttribute("data-question");
          if (question && dom.questionInput) {
            // 다른 칩 active 스타일 해제 후 현재 칩 강조
            dom.quickChips.forEach(function (c) { c.classList.remove("active-chip"); });
            chip.classList.add("active-chip");

            // 질문 입력창에 질문 텍스트 채우기 및 포커스
            dom.questionInput.value = question;
            dom.questionInput.focus();

            // 질문 카드가 닫혀있다면 펼치기
            if (dom.container && !dom.container.open) {
              dom.container.open = true;
            }

            // 💡 중요: 질문을 채운 후 자동 전송하지 않고 사용자가 [질문하기] 버튼을 누르도록 대기!
          }
        });
      });
    }

    // 질문/답변 초기화
    if (dom.clearChatBtn) {
      dom.clearChatBtn.addEventListener("click", function () {
        if (dom.questionInput) dom.questionInput.value = "";
        if (dom.responseWrapper) dom.responseWrapper.style.display = "none";
        if (dom.responseContent) dom.responseContent.innerHTML = "";
        if (dom.previewDetails) dom.previewDetails.style.display = "none";
        lastGeneratedRawText = "";
        if (dom.quickChips) {
          dom.quickChips.forEach(function (c) { c.classList.remove("active-chip"); });
        }
      });
    }

    // 전송 프롬프트 미리보기 토글 (화면 프리징 및 스크롤 부하 방지: 경량 발췌 렌더링)
    if (dom.previewContextBtn && dom.previewDetails && dom.previewContent) {
      dom.previewContextBtn.addEventListener("click", function () {
        var isShown = dom.previewDetails.style.display !== "none";
        if (isShown) {
          dom.previewDetails.style.display = "none";
          dom.previewDetails.open = false;
        } else {
          var payload = currentPayloadRef || (window.currentRawPayload || null);
          var systemPrompt = buildSystemPromptAndContext(payload, dom.questionInput ? dom.questionInput.value : "");
          
          // 💡 화면 렌더링 부하 및 스크롤 먹통 방지: 상위 2,500자만 발췌 표시
          var PREVIEW_MAX_LEN = 2500;
          var displayPrompt = systemPrompt;
          if (systemPrompt.length > PREVIEW_MAX_LEN) {
            displayPrompt = systemPrompt.slice(0, PREVIEW_MAX_LEN) + 
              "\n\n------------------------------------------------------------\n" +
              "💡 [안내] 화면 스크롤 부하 및 브라우저 프리징을 방지하기 위해 상위 2,500자만 발췌 표시합니다.\n" +
              "   (실제 Gemini LLM에는 정제된 전체 서류 데이터 " + Math.round(systemPrompt.length / 1024) + " KB가 안전하게 실시간 전송됩니다.)";
          }
          dom.previewContent.textContent = displayPrompt;
          dom.previewDetails.style.display = "block";
          dom.previewDetails.open = true;
        }
      });
    }

    // 답변 클립보드 복사 버튼 (표 마크다운 원본 온전 복사)
    if (dom.copyResponseBtn) {
      dom.copyResponseBtn.addEventListener("click", function () {
        var textToCopy = lastGeneratedRawText || (dom.responseContent ? (dom.responseContent.innerText || dom.responseContent.textContent) : "");
        if (!textToCopy) {
          alert("복사할 응답 결과가 없습니다.");
          return;
        }
        navigator.clipboard.writeText(textToCopy).then(function () {
          var originalHtml = dom.copyResponseBtn.innerHTML;
          dom.copyResponseBtn.innerHTML = '<i class="bi bi-check-lg"></i> 복사 완료!';
          dom.copyResponseBtn.classList.add("btn-success");
          setTimeout(function () {
            dom.copyResponseBtn.innerHTML = originalHtml;
            dom.copyResponseBtn.classList.remove("btn-success");
          }, 2000);
        }).catch(function (err) {
          alert("클립보드 복사에 실패했습니다: " + err);
        });
      });
    }

    // 답변 파일 다운로드 (.md 마크다운 파일 저장)
    if (dom.downloadResponseBtn) {
      dom.downloadResponseBtn.addEventListener("click", function () {
        var rawAnswer = lastGeneratedRawText || (dom.responseContent ? (dom.responseContent.innerText || dom.responseContent.textContent) : "");
        if (!rawAnswer) {
          alert("다운로드할 응답 결과가 없습니다.");
          return;
        }

        var currentQuestion = dom.questionInput ? dom.questionInput.value.trim() : "무역 서류 정밀 질의";
        var now = new Date();
        var dateFormatted = now.getFullYear() +
          String(now.getMonth() + 1).padStart(2, "0") +
          String(now.getDate()).padStart(2, "0") + "_" +
          String(now.getHours()).padStart(2, "0") +
          String(now.getMinutes()).padStart(2, "0") +
          String(now.getSeconds()).padStart(2, "0");
        var filename = "AI-OCR_Gemini_질의결과_" + dateFormatted + ".md";

        var markdownDocument = [
          "# 🤖 신용장 무역 서류 AI 심층 질의응답 결과",
          "",
          "- **생성 일시**: " + now.toLocaleString(),
          "- **사용 모델**: " + (dom.modelUsedBadge ? dom.modelUsedBadge.textContent : "Gemini"),
          "- **사용자 질의**: " + currentQuestion,
          "",
          "---",
          "",
          "## 📋 Gemini 응답 내용 (표 및 분석 결과)",
          "",
          rawAnswer,
          "",
          "---",
          "> 본 결과는 Upstage AI-OCR 추출 원본 데이터를 바탕으로 Google Gemini LLM이 실시간 분석한 내용입니다."
        ].join("\n");

        var blob = new Blob([markdownDocument], { type: "text/markdown;charset=utf-8;" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    }
  }

  /**
   * 1. 위치값(Bounding Box, 좌표, Polygons 등) 재귀적 정제 함수
   * LLM 컨텍스트 토큰을 최소화하고 노이즈를 제거하여 답변 품질 극대화
   */
  /**
   * 1. 위치값(Bounding Box, 좌표, Polygons 등) 및 대용량 HTML/바이너리 데이터 정제 함수
   * LLM 컨텍스트 토큰을 최소화하고 노이즈 및 브라우저 메모리 부하를 원천 차단
   */
  function cleanOcrJsonForLlm(data) {
    if (!data) return null;

    var IGNORED_KEYS = {
      bounding_box: true,
      bounding_boxes: true,
      vertices: true,
      box: true,
      boxes: true,
      coord: true,
      coords: true,
      coordinates: true,
      "data-coord": true,
      polygon: true,
      polygons: true,
      page_dimensions: true,
      pixel_coords: true,
      location: true,
      locations: true,
      upstage_seq: true,
      // 💡 화면 프리징 및 부하 원인인 대용량 Raw HTML/덤프 키 완전 제외
      html: true,
      raw_html: true,
      ocr_html: true,
      raw_content: true,
      table_html: true,
      figure: true,
      additional_values_raw: true,
      sources_raw: true,
      tool_calls_raw: true
    };

    function sanitize(obj, depth) {
      if (depth > 8) return "[Nested Object]";
      if (obj === null || obj === undefined) return obj;

      if (typeof obj === "string") {
        // HTML 내의 data-coord 제거
        var cleanStr = obj.replace(/\s*data-coord\s*=\s*\\?['"][^'"]*\\?['"]/gi, "");
        // 너무 긴 base64 이미지, 바이너리, 또는 거대한 HTML 블록 축약
        if (cleanStr.length > 800) {
          if (cleanStr.indexOf("<html") !== -1 || cleanStr.indexOf("<table") !== -1 || cleanStr.indexOf("<figure") !== -1 || cleanStr.startsWith("data:image")) {
            return "[Raw OCR HTML Omitted for Performance]";
          }
          // 일반 문자열도 1000자 초과 시 요약
          return cleanStr.slice(0, 1000) + "... [Truncated]";
        }
        return cleanStr;
      }

      if (typeof obj !== "object") {
        return obj;
      }

      if (Array.isArray(obj)) {
        // 배열 원소가 30개를 초과하면 상위 30개만 유지
        var sliceArr = obj.length > 30 ? obj.slice(0, 30) : obj;
        return sliceArr.map(function (item) {
          return sanitize(item, depth + 1);
        }).filter(function (item) {
          return item !== undefined;
        });
      }

      var result = {};
      var keys = Object.keys(obj);
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var lowerKey = key.toLowerCase();

        // 위치값 관련 및 거대 필드는 무조건 스킵
        if (IGNORED_KEYS[lowerKey] || lowerKey.indexOf("coord") !== -1 || lowerKey.indexOf("bounding") !== -1) {
          continue;
        }

        var val = sanitize(obj[key], depth + 1);
        if (val !== undefined) {
          result[key] = val;
        }
      }
      return result;
    }

    return sanitize(data, 0);
  }

  /**
   * 2. 서류 스키마 및 원본 추출 데이터 선별 정리
   * 거대한 parse 스텝(OCR raw HTML)은 제외하고,
   * 서류 원본의 실제 추출 필드(extract_result, documents, data)를 중심 데이터셋으로 재구성 (10~30KB 내외 초경량)
   */
  function extractKeyDocumentsData(rawPayload) {
    if (!rawPayload) return null;

    var organized = {
      documents_extracted: {},
      document_keys: {},
      date_records: {},
      summary_notes: ""
    };

    // 1) Upstage include: ["all"] steps 또는 output 처리
    var stepsList = (rawPayload && Array.isArray(rawPayload.output)) ? rawPayload.output : ((rawPayload && Array.isArray(rawPayload.steps)) ? rawPayload.steps : null);
    if (stepsList && stepsList.length > 0) {
      for (var i = 0; i < stepsList.length; i++) {
        var step = stepsList[i];
        if (!step) continue;
        var modelName = String(step.model || step.step_name || step.step_type || "").toLowerCase();

        // 💡 중요: step_1_parse 등 1.5MB짜리 Raw HTML 파싱 덤프 step은 100% 제외
        if (modelName.indexOf("parse") !== -1) {
          continue;
        }

        // extract step의 documents 수집
        if (step.result && Array.isArray(step.result.documents)) {
          for (var d = 0; d < step.result.documents.length; d++) {
            var docItem = step.result.documents[d];
            var dName = docItem.document_type || docItem.schema_name || ("doc_" + d);
            organized.documents_extracted[dName] = cleanOcrJsonForLlm(docItem.data || docItem);
          }
        } else if (Array.isArray(step.content)) {
          for (var c = 0; c < step.content.length; c++) {
            var cItem = step.content[c];
            if (!cItem || !cItem.text) continue;
            try {
              var textTrim = String(cItem.text).trim();
              if (textTrim.startsWith("{") || textTrim.startsWith("[")) {
                var parsedInner = JSON.parse(textTrim);
                if (parsedInner && typeof parsedInner === "object" && !parsedInner.api) {
                  var docType = parsedInner.document_type || modelName.replace(/^information extract\s*-\s*/i, "").replace(/_schema$/i, "").trim();
                  if (docType) {
                    organized.documents_extracted[docType] = cleanOcrJsonForLlm(parsedInner);
                  }
                }
              }
            } catch (e) {}
          }
        }
      }
    }

    // 2) instruct_result / structured_result 내의 핵심 서류 키 및 일자 흐름
    var struct = (rawPayload.instruct_result && rawPayload.instruct_result.structured_result) || rawPayload.structured_result || rawPayload;
    if (struct.document_keys) {
      organized.document_keys = cleanOcrJsonForLlm(struct.document_keys);
    }
    if (struct.date_checks) {
      organized.date_records = cleanOcrJsonForLlm(struct.date_checks);
    }
    if (struct.one_line_summary) {
      organized.summary_notes = struct.one_line_summary;
    }

    // 만약 documents_extracted가 비어있는 경우 (단순 JSON 포맷)
    if (Object.keys(organized.documents_extracted).length === 0) {
      var safeData = {};
      if (struct.document_keys) safeData.document_keys = struct.document_keys;
      if (struct.date_checks) safeData.date_checks = struct.date_checks;
      if (struct.document_presence) safeData.document_presence = struct.document_presence;
      if (struct.discrepancy_candidates) safeData.discrepancy_candidates = cleanOcrJsonForLlm(struct.discrepancy_candidates);
      return cleanOcrJsonForLlm(safeData);
    }

    return organized;
  }

  /**
   * 3. 시스템 프롬프트 및 파싱 규칙 가이드 생성 (사용자 요구사항 1, 2, 3 반영)
   */
  function buildSystemPromptAndContext(rawPayload, userQuestion) {
    var extractedData = extractKeyDocumentsData(rawPayload);
    var jsonString = extractedData ? JSON.stringify(extractedData, null, 2) : "{\n  \"message\": \"현재 로드된 서류 JSON 데이터가 없습니다. 일반 무역/신용장 지식으로 답변하십시오.\"\n}";

    // 프롬프트 본문 조립
    var systemPrompt = [
      "당신은 국제무역, 신용장(UCP 600, ISBP 821) 및 선적서류(L/C, Commercial Invoice, Bill of Lading, Packing List, Insurance Certificate, COO 등) 심사 및 정밀 데이터 분석 전문 AI 어시스턴트입니다.",
      "",
      "아래는 Upstage AI-OCR 엔진을 통해 사용자의 무역 서류 원본으로부터 추출된 파싱 데이터(JSON)입니다.",
      "",
      "==================================================================",
      "■ [핵심 분석 및 파싱 규칙 (Mandatory Rules)]",
      "1. 위치값(Coordinates) 절대 무시:",
      "   - JSON 내에 남아있을 수 있는 바운딩 박스, 좌표값([x, y] 등), 픽셀 위치값은 서류 내용 분석에 전혀 불필요하므로 완전히 무시하십시오.",
      "2. 원본 서류(Raw Document) 데이터 중심 분석:",
      "   - API 시스템이 1차 기계적으로 수행한 검토 결과(comparison_matrix, overall_status 등)는 이미 사용자가 화면에서 확인하였으므로 질문의 주 대상으로 삼지 마십시오.",
      "   - 오직 서류 원본에서 직접 추출된 필드값(송장 번호, L/C 번호, B/L 번호, 품목명, 단가, 수량, 금액, 발행일, 선적일, 컨테이너 번호, 씰 번호, 서명자, 비고 및 특약사항 등)을 기반으로 심층 분석하십시오.",
      "3. 서류 스키마 파싱 지침:",
      "   - lc_schema: 신용장 조건 (L/C 번호, 개설일, 유효기일, 금액, 선적기한, 분할/환적 조건, 요구서류 등)",
      "   - commercial_invoice_schema: 상업송장 (송장일자, 품목별 명세, 단가, 수량, 계산 총액, 지급조건, 서명 등)",
      "   - bill_of_lading_schema: 선하증권 (B/L 일자, 본선적재일 On Board Date, 선박명, 선적항/양하항, 컨테이너/씰 번호, 총중량, 용적 등)",
      "   - packing_list_schema: 포장명세서 (포장 개수, 포장단위, 순중량 Net Wt, 총중량 Gross Wt, CBM 등)",
      "   - marine_cargo_insurance_schema: 적하보험증권 (부보금액, 증권일자, 부보조건, 약관 등)",
      "   - certificate_of_origin_schema: 원산지증명서 (원산지 국가, 수출자, 생산자, 인증번호 등)",
      "4. 답변 출력 형식 및 시각화 다이어그램 규칙 (엄격 준수):",
      "   - 결과는 사용자가 한눈에 파악할 수 있도록 마크다운 표(Table) 형태로 정리하여 제공하십시오.",
      "   - 각 표는 명확한 헤더(예: 서류명, 항목, 기재 내용, 일치/검증 결과, 비고 등)를 포함하십시오.",
      "   - 서류 발행 순서, 물류 흐름, 당사자 관계도 등 시각화 질문 시 Mermaid 다이어그램(```mermaid ... ```)을 반드시 작성하십시오.",
      "   ★ Mermaid 다이어그램 문법 필수 지침 (Syntax Error 방지):",
      "     1) 다이어그램 유형은 반드시 'flowchart TD' 또는 'sequenceDiagram'만 사용하십시오. (journey, gantt 등은 절대 사용 금지)",
      "     2) flowchart 노드 텍스트: 한글, 날짜, 괄호, 슬래시(/), 콤마 등 모든 텍스트는 반드시 노드 라벨 전체를 큰따옴표(\")로 감싸십시오.",
      "        [올바른 예]: STEP1[\"신용장 개설 (2026-08-25)\"] --> STEP2[\"상업송장/패킹리스트 작성 (09-02)\"]",
      "        [틀린 예]: STEP1[신용장 개설 (2026-08-25)] (따옴표 누락 시 구문 분석 오류 발생)",
      "     3) 노드 ID는 반드시 공백이나 특수문자가 없는 순수 영문/숫자(예: LC, INV, BL, INS, CO, STEP1 등)만 사용하십시오.",
      "     4) sequenceDiagram 사용 시 화살표(-->>, ->>, ->)를 정확히 사용하고 메시지 내부에 콜론(:)이나 따옴표 충돌이 없도록 하십시오.",
      "   - 한국어로 정중하고 전문적인 어조(수출입 은행 심사역 스타일)로 명료하게 답변하십시오.",
      "==================================================================",
      "",
      "■ [추출된 서류 JSON 데이터]:",
      "```json",
      jsonString,
      "```",
      "",
      "■ [사용자 질의]:",
      userQuestion ? userQuestion.trim() : "(질문 내용이 없습니다. 서류의 핵심 내용 요약 및 서류별 주요 정보 비교표를 작성해주세요.)"
    ].join("\n");

    return systemPrompt;
  }

  /**
   * 4. Gemini API 호출 함수 (사용자 요구사항 5 반영)
   */
  async function callGeminiApi(promptText, apiKey, modelName) {
    if (!apiKey) {
      throw new Error("Gemini API Key가 설정되지 않았습니다.");
    }
    modelName = modelName || DEFAULT_MODEL;

    // 엔드포인트 URL
    var endpoint = "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(modelName) + ":generateContent?key=" + encodeURIComponent(apiKey);

    var requestBody = {
      contents: [
        {
          role: "user",
          parts: [
            { text: promptText }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        topP: 0.95,
        maxOutputTokens: 8192
      }
    };

    var response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      var errData = null;
      try {
        errData = await response.json();
      } catch (e) {
        errData = { message: await response.text() };
      }
      var errMsg = (errData && errData.error && errData.error.message) ? errData.error.message : ("HTTP 오류 " + response.status);
      if (response.status === 429) {
        errMsg = "Gemini API 무료 등급 사용 한도(분당 요청 수 또는 분당 토큰 수 TPM)를 일시 초과했습니다. 약 1분 후 다시 시도해주세요. (" + errMsg + ")";
      } else if (response.status === 401) {
        errMsg = "Gemini API 인증 실패 (유효하지 않은 API 키): " + errMsg;
      }
      throw new Error("Gemini API 응답 실패 (" + response.status + "): " + errMsg);
    }

    var result = await response.json();
    if (!result.candidates || result.candidates.length === 0 || !result.candidates[0].content) {
      throw new Error("Gemini로부터 유효한 텍스트 응답을 받지 못했습니다.");
    }

    var candidate = result.candidates[0];
    var parts = candidate.content.parts || [];
    var fullText = "";
    for (var p = 0; p < parts.length; p++) {
      if (parts[p].text) {
        fullText += parts[p].text;
      }
    }

    return {
      text: fullText,
      model: modelName,
      usage: result.usageMetadata || null
    };
  }

  /**
   * 5. 질문 전송 핸들러
   */
  async function handleSendQuestion() {
    if (isGenerating) return;

    var question = dom.questionInput ? dom.questionInput.value.trim() : "";
    if (!question) {
      alert("서류에 대해 질문할 내용을 입력해주세요.");
      if (dom.questionInput) dom.questionInput.focus();
      return;
    }

    // 💡 화면에서 분리되어 안전하게 고정된 Gemini API Key 사용
    var apiKey = DEFAULT_API_KEY;
    if (!apiKey) {
      alert("Gemini API Key가 내부 설정되지 않았습니다.");
      return;
    }

    var modelName = dom.modelSelect ? dom.modelSelect.value : DEFAULT_MODEL;
    var rawPayload = currentPayloadRef || (window.currentRawPayload || null);

    // UI 상태: 질문 진행 중으로 변경
    isGenerating = true;
    if (dom.sendBtn) {
      dom.sendBtn.disabled = true;
      dom.sendBtn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> <span>답변 생성 중...</span>';
    }
    if (dom.responseWrapper) {
      dom.responseWrapper.style.display = "block";
    }
    if (dom.loadingSpinner) {
      dom.loadingSpinner.style.display = "flex";
    }
    if (dom.responseContent) {
      dom.responseContent.innerHTML = "";
    }
    if (dom.modelUsedBadge) {
      dom.modelUsedBadge.textContent = modelName;
    }

    // 시스템 프롬프트 조립
    var fullPrompt = buildSystemPromptAndContext(rawPayload, question);

    try {
      var apiResult = await callGeminiApi(fullPrompt, apiKey, modelName);
      renderApiResponse(apiResult.text, apiResult.model);
    } catch (err) {
      console.error("[LLM] 질문 처리 오류:", err);
      renderApiError(err.message, modelName);
    } finally {
      isGenerating = false;
      if (dom.sendBtn) {
        dom.sendBtn.disabled = false;
        dom.sendBtn.innerHTML = '<i class="bi bi-send-fill"></i> <span>Gemini에게 질문하기</span>';
      }
      if (dom.loadingSpinner) {
        dom.loadingSpinner.style.display = "none";
      }
    }
  }

  /**
   * 6. 마크다운 및 Mermaid 다이어그램 렌더링 (사용자 요구사항 3 반영)
   */
  function renderApiResponse(markdownText, modelName) {
    if (!dom.responseContent) return;
    lastGeneratedRawText = markdownText || "";

    // 마크다운 HTML 파싱
    var renderedHtml = "";
    if (window.marked && typeof window.marked.parse === "function") {
      try {
        renderedHtml = marked.parse(markdownText, {
          gfm: true,
          breaks: true
        });
      } catch (e) {
        console.warn("[LLM] marked 파싱 오류, fallback 적용:", e);
        renderedHtml = fallbackMarkdownParse(markdownText);
      }
    } else {
      renderedHtml = fallbackMarkdownParse(markdownText);
    }

    // 결과 HTML 주입
    dom.responseContent.innerHTML = renderedHtml;

    // 테이블 클래스 부여 및 반응형 래핑
    var tables = dom.responseContent.querySelectorAll("table");
    tables.forEach(function (tbl) {
      tbl.classList.add("llm-result-table");
      if (!tbl.parentElement.classList.contains("llm-table-responsive")) {
        var wrapper = document.createElement("div");
        wrapper.className = "llm-table-responsive";
        tbl.parentNode.insertBefore(wrapper, tbl);
        wrapper.appendChild(tbl);
      }
    });

    // Mermaid 다이어그램 렌더링
    renderMermaidDiagrams();

    // 스크롤 이동
    if (dom.responseWrapper) {
      dom.responseWrapper.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  // HTML 이스케이프 헬퍼
  function escapeHtml(str) {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /**
   * Mermaid 다이어그램 코드 자동 정제 및 문법 보정 함수
   * LLM이 자주 범하는 따옴표 누락, 특수문자, HTML 엔티티 등을 자동 수리
   */
  function sanitizeMermaidCode(rawCode) {
    if (!rawCode) return "";
    var code = rawCode.trim();

    // 1. HTML 엔티티 디코딩
    code = code
      .replace(/&gt;/g, ">")
      .replace(/&lt;/g, "<")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, "&");

    // 2. 만약 첫 줄에 다이어그램 유형(flowchart, sequenceDiagram 등)이 없으면 기본 flowchart TD 지정
    var firstLine = code.split("\n")[0].trim();
    var validTypes = ["graph", "flowchart", "sequencediagram", "classdiagram", "statediagram", "erdiagram", "gantt", "pie", "journey"];
    var hasValidType = validTypes.some(function (t) {
      return firstLine.toLowerCase().startsWith(t);
    });
    if (!hasValidType) {
      code = "flowchart TD\n" + code;
    }

    // 3. flowchart / graph 에서 따옴표 없는 대괄호 라벨 자동 따옴표 감싸기
    // 예: NODE[내용 (괄호) / 슬래시] -> NODE["내용 (괄호) / 슬래시"]
    code = code.replace(/([a-zA-Z0-9_-]+)\[([^"\]\r\n]+)\]/g, function (match, id, label) {
      var cleanLabel = label.replace(/"/g, "'").trim();
      return id + '["' + cleanLabel + '"]';
    });

    // 4. flowchart / graph 에서 따옴표 없는 원형 괄호 라벨 자동 따옴표 감싸기
    // 예: NODE(내용 (괄호)) -> NODE("내용 (괄호)")
    code = code.replace(/([a-zA-Z0-9_-]+)\(([^"\)\r\n]+)\)/g, function (match, id, label) {
      var cleanLabel = label.replace(/"/g, "'").trim();
      return id + '("' + cleanLabel + '")';
    });

    return code;
  }

  // Mermaid 코드 블록 탐색 및 렌더링 (비동기 render + 자동 복구 + 친절한 폴백 UI)
  async function renderMermaidDiagrams() {
    if (!window.mermaid || !dom.responseContent) return;

    // <pre><code class="language-mermaid"> 또는 <pre class="mermaid"> 탐색
    var codeBlocks = dom.responseContent.querySelectorAll("code.language-mermaid, pre.mermaid, code.mermaid");
    if (!codeBlocks || codeBlocks.length === 0) return;

    for (var idx = 0; idx < codeBlocks.length; idx++) {
      var block = codeBlocks[idx];
      var parent = block.tagName.toLowerCase() === "code" ? block.parentElement : block;
      var rawMermaid = block.textContent.trim();
      var sanitized = sanitizeMermaidCode(rawMermaid);
      var renderId = "mermaid_svg_" + idx + "_" + Math.floor(Math.random() * 1000000);

      var container = document.createElement("div");
      container.className = "mermaid-container";
      container.id = "mermaid-wrap-" + idx;
      parent.parentNode.replaceChild(container, parent);

      try {
        // 1차: 정제된 코드로 렌더링 시도
        var renderResult = await mermaid.render(renderId, sanitized);
        container.innerHTML = renderResult.svg;
      } catch (err1) {
        console.warn("[LLM] Mermaid 1차 렌더링 실패, 보정 재시도:", err1);
        try {
          // 2차: flowchart TD로 변환 및 핵심 노드 추출 시도
          var lines = rawMermaid.split("\n");
          var flowLines = ["flowchart TD"];
          var stepCount = 1;
          lines.forEach(function (line) {
            var trimmed = line.trim();
            if (trimmed && !trimmed.startsWith("journey") && !trimmed.startsWith("section") && !trimmed.startsWith("title")) {
              var parts = trimmed.split(":");
              var nodeText = parts[0].replace(/["\[\]\(\)]/g, "").trim();
              if (nodeText) {
                flowLines.push("  N" + stepCount + '["' + nodeText + '"]');
                if (stepCount > 1) {
                  flowLines.push("  N" + (stepCount - 1) + " --> N" + stepCount);
                }
                stepCount++;
              }
            }
          });
          var flowCode = flowLines.join("\n");
          var renderResult2 = await mermaid.render(renderId + "_fix", flowCode);
          container.innerHTML = renderResult2.svg;
        } catch (err2) {
          console.error("[LLM] Mermaid 최종 렌더링 실패:", err2);
          // 친절하고 세련된 다이어그램 코드 뷰(폴백 카드) 제공
          container.classList.add("mermaid-fallback-box");
          container.innerHTML = [
            '<div class="mermaid-fallback-header">',
            '  <div class="mermaid-fallback-title"><i class="bi bi-diagram-3-fill"></i> 다이어그램 코드 뷰 (Mermaid 문법 오류로 시각화 미적용)</div>',
            '  <button class="btn btn-sm btn-outline-secondary mermaid-copy-code-btn" type="button"><i class="bi bi-clipboard"></i> 다이어그램 코드 복사</button>',
            '</div>',
            '<pre class="mermaid-fallback-code"><code>' + escapeHtml(rawMermaid) + '</code></pre>'
          ].join("");

          var copyBtn = container.querySelector(".mermaid-copy-code-btn");
          if (copyBtn) {
            (function (codeToCopy, btn) {
              btn.addEventListener("click", function () {
                navigator.clipboard.writeText(codeToCopy).then(function () {
                  btn.innerHTML = '<i class="bi bi-check-lg"></i> 복사됨!';
                  setTimeout(function () {
                    btn.innerHTML = '<i class="bi bi-clipboard"></i> 다이어그램 코드 복사';
                  }, 2000);
                });
              });
            })(rawMermaid, copyBtn);
          }
        }
      }
    }
  }

  // 에러 화면 렌더링
  function renderApiError(errorMessage, modelName) {
    if (!dom.responseContent) return;
    dom.responseContent.innerHTML = [
      '<div class="llm-error-banner">',
      '  <div class="llm-error-icon"><i class="bi bi-exclamation-triangle-fill"></i></div>',
      '  <div class="llm-error-body">',
      '    <h4>질문 처리 중 오류가 발생했습니다</h4>',
      '    <p>' + escapeHtml(errorMessage) + '</p>',
      '    <div class="llm-error-guide">',
      '      <strong>문제 해결 가이드:</strong>',
      '      <ul>',
      '        <li>상단의 <strong>Gemini API Key</strong>가 올바른지 확인해주세요. (무료 키의 일일 쿼터 초과 여부 확인)</li>',
      '        <li>모델을 <strong>Gemini 3.5 Flash-Lite</strong>로 변경 후 다시 시도해보세요.</li>',
      '        <li>네트워크 연결 상태 및 구글 AI Studio 서비스 정상 여부를 확인해주세요.</li>',
      '      </ul>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join("\n");
  }

  // 간단한 Fallback 마크다운 파서 (marked 미로드 시)
  function fallbackMarkdownParse(md) {
    if (!md) return "";
    var lines = md.split("\n");
    var html = [];
    var inTable = false;
    var tableRows = [];

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (line.startsWith("|") && line.endsWith("|")) {
        inTable = true;
        tableRows.push(line);
      } else {
        if (inTable) {
          html.push(renderFallbackTable(tableRows));
          inTable = false;
          tableRows = [];
        }
        if (line.startsWith("### ")) {
          html.push("<h3>" + escapeHtml(line.slice(4)) + "</h3>");
        } else if (line.startsWith("## ")) {
          html.push("<h2>" + escapeHtml(line.slice(3)) + "</h2>");
        } else if (line.startsWith("# ")) {
          html.push("<h1>" + escapeHtml(line.slice(2)) + "</h1>");
        } else if (line.startsWith("- ")) {
          html.push("<li>" + escapeHtml(line.slice(2)) + "</li>");
        } else if (line.length > 0) {
          html.push("<p>" + escapeHtml(line) + "</p>");
        }
      }
    }
    if (inTable) {
      html.push(renderFallbackTable(tableRows));
    }
    return html.join("\n");
  }

  function renderFallbackTable(rows) {
    if (rows.length < 2) return "";
    var out = '<div class="llm-table-responsive"><table class="llm-result-table"><thead><tr>';
    var headers = rows[0].split("|").slice(1, -1);
    for (var h = 0; h < headers.length; h++) {
      out += "<th>" + escapeHtml(headers[h].trim()) + "</th>";
    }
    out += "</tr></thead><tbody>";
    for (var r = 2; r < rows.length; r++) {
      var cells = rows[r].split("|").slice(1, -1);
      out += "<tr>";
      for (var c = 0; c < cells.length; c++) {
        out += "<td>" + escapeHtml(cells[c].trim()) + "</td>";
      }
      out += "</tr>";
    }
    out += "</tbody></table></div>";
    return out;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /**
   * 7. 외부(app.js)에서 호출하는 상태 업데이트 브릿지
   */
  function updateLlmAssistantContext(payload) {
    currentPayloadRef = payload;
    if (!dom.statusBadge) cacheDomElements();
    if (!dom.statusBadge) return;

    if (payload) {
      var extracted = extractKeyDocumentsData(payload);
      var docCount = extracted && extracted.documents_extracted ? Object.keys(extracted.documents_extracted).length : 0;
      var countText = docCount > 0 ? " (" + docCount + "개 서류 추출됨)" : " (데이터 로드됨)";

      dom.statusBadge.textContent = "서류 데이터 연동 완료" + countText;
      dom.statusBadge.className = "llm-doc-status-badge badge-ready";
      dom.statusBadge.title = "현재 서류의 파싱 데이터가 LLM 컨텍스트로 전달될 준비가 되었습니다.";
    } else {
      dom.statusBadge.textContent = "서류 로드 대기";
      dom.statusBadge.className = "llm-doc-status-badge badge-waiting";
      dom.statusBadge.title = "좌측에서 서류를 업로드하거나 샘플을 선택하여 점검을 실행해주세요.";
    }
  }

  // 전역 노출
  window.updateLlmAssistantContext = updateLlmAssistantContext;
  window.cleanOcrJsonForLlm = cleanOcrJsonForLlm;

  // DOMContentLoaded 시 실행
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
