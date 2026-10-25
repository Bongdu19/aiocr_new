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
    ? atob("QVEuQWI4Uk42STJ2ZjJVTmRjT2JXN2RBS0xuZE9yY2djYUxZWmUyMEY3cFBteTh6aWUyTXc=")
    : "";
  var DEFAULT_MODEL = "gemini-3.5-flash-lite";

  // 현재 캐시된 원본 OCR 데이터 (메모리 전용)
  var currentPayloadRef = null;
  var isGenerating = false;

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
    if (dom.apiKeyInput) {
      dom.apiKeyInput.value = DEFAULT_API_KEY;
    }
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
    dom.apiKeyInput = document.getElementById("llmApiKey");
    dom.keyToggleBtn = document.getElementById("llmKeyToggleBtn");
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
          flowchart: { useMaxWidth: true, htmlLabels: true, curve: "basis" }
        });
      } catch (e) {
        console.warn("[LLM] Mermaid 초기화 실패:", e);
      }
    }
  }

  // 이벤트 바인딩
  function bindEvents() {
    // 키 표시/숨김 토글
    if (dom.keyToggleBtn && dom.apiKeyInput) {
      dom.keyToggleBtn.addEventListener("click", function () {
        var isPassword = dom.apiKeyInput.type === "password";
        dom.apiKeyInput.type = isPassword ? "text" : "password";
        dom.keyToggleBtn.innerHTML = isPassword
          ? '<i class="bi bi-eye-slash"></i>'
          : '<i class="bi bi-eye"></i>';
      });
    }

    // 질문 전송 버튼
    if (dom.sendBtn) {
      dom.sendBtn.addEventListener("click", handleSendQuestion);
    }

    // 엔터키 전송 (Shift+Enter는 줄바꿈)
    if (dom.questionInput) {
      dom.questionInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          handleSendQuestion();
        }
      });
    }

    // 추천 질문 칩 클릭
    if (dom.quickChips && dom.quickChips.length > 0) {
      dom.quickChips.forEach(function (chip) {
        chip.addEventListener("click", function () {
          var question = chip.getAttribute("data-question");
          if (question && dom.questionInput) {
            dom.questionInput.value = question;
            dom.questionInput.focus();
            // 질문 카드가 닫혀있다면 펼치기
            if (dom.container && !dom.container.open) {
              dom.container.open = true;
            }
            // 바로 질문 전송 실행
            handleSendQuestion();
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
      });
    }

    // 전송 프롬프트 미리보기 토글
    if (dom.previewContextBtn && dom.previewDetails && dom.previewContent) {
      dom.previewContextBtn.addEventListener("click", function () {
        var isShown = dom.previewDetails.style.display !== "none";
        if (isShown) {
          dom.previewDetails.style.display = "none";
          dom.previewDetails.open = false;
        } else {
          var payload = currentPayloadRef || (window.currentRawPayload || null);
          var systemPrompt = buildSystemPromptAndContext(payload, dom.questionInput ? dom.questionInput.value : "");
          dom.previewContent.textContent = systemPrompt;
          dom.previewDetails.style.display = "block";
          dom.previewDetails.open = true;
        }
      });
    }

    // 답변 복사 버튼
    if (dom.copyResponseBtn && dom.responseContent) {
      dom.copyResponseBtn.addEventListener("click", function () {
        var textToCopy = dom.responseContent.innerText || dom.responseContent.textContent;
        if (!textToCopy) return;
        navigator.clipboard.writeText(textToCopy).then(function () {
          var originalHtml = dom.copyResponseBtn.innerHTML;
          dom.copyResponseBtn.innerHTML = '<i class="bi bi-check-lg"></i> 복사 완료';
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
  }

  /**
   * 1. 위치값(Bounding Box, 좌표, Polygons 등) 재귀적 정제 함수
   * LLM 컨텍스트 토큰을 최소화하고 노이즈를 제거하여 답변 품질 극대화
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
      upstage_seq: true
    };

    function sanitize(obj, depth) {
      if (depth > 12) return "[Deep Nested]";
      if (obj === null || obj === undefined) return obj;

      if (typeof obj === "string") {
        // HTML 내의 data-coord="top-left:(...); bottom-right:(...)" 제거
        var cleanStr = obj.replace(/\s*data-coord\s*=\s*\\?['"][^'"]*\\?['"]/gi, "");
        // 너무 긴 base64 이미지나 바이너리는 축약
        if (cleanStr.length > 3000 && (cleanStr.startsWith("data:image") || cleanStr.startsWith("<svg"))) {
          return "[Image Data Omitted]";
        }
        return cleanStr;
      }

      if (typeof obj !== "object") {
        return obj;
      }

      if (Array.isArray(obj)) {
        return obj.map(function (item) {
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

        // 위치값 관련 필드는 무조건 스킵
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
   * 기계적 1차 검토 결과(comparison_matrix, overall_status)는 축약하고,
   * 서류 원본의 실제 추출 필드(extract_result, documents, data)를 중심 데이터셋으로 재구성
   */
  function extractKeyDocumentsData(rawPayload) {
    if (!rawPayload) return null;
    var cleaned = cleanOcrJsonForLlm(rawPayload);

    var organized = {
      documents_extracted: {},
      document_keys: {},
      raw_text_excerpts: []
    };

    // (A) Upstage include: ["all"] steps 또는 output 처리
    var stepsList = (cleaned && Array.isArray(cleaned.output)) ? cleaned.output : ((cleaned && Array.isArray(cleaned.steps)) ? cleaned.steps : null);
    if (stepsList && stepsList.length > 0) {
      for (var i = 0; i < stepsList.length; i++) {
        var step = stepsList[i];
        if (!step) continue;
        var modelName = String(step.model || step.step_name || "").toLowerCase();

        // 1) 개별 서류 추출 스키마 데이터 (extract step)
        if (step.result && Array.isArray(step.result.documents)) {
          for (var d = 0; d < step.result.documents.length; d++) {
            var docItem = step.result.documents[d];
            var dName = docItem.document_type || docItem.schema_name || ("doc_" + d);
            organized.documents_extracted[dName] = docItem.data || docItem;
          }
        } else if (Array.isArray(step.content)) {
          for (var c = 0; c < step.content.length; c++) {
            var cItem = step.content[c];
            if (!cItem || !cItem.text) continue;
            try {
              var parsedInner = (typeof cItem.text === "string" && (cItem.text.startsWith("{") || cItem.text.startsWith("[")))
                ? JSON.parse(cItem.text)
                : cItem.text;
              if (parsedInner && typeof parsedInner === "object") {
                var docType = parsedInner.document_type || modelName.replace(/^information extract\s*-\s*/i, "").replace(/_schema$/i, "");
                if (docType) {
                  organized.documents_extracted[docType] = parsedInner;
                }
              } else if (typeof parsedInner === "string" && parsedInner.length > 50) {
                // OCR 텍스트 요약본
                organized.raw_text_excerpts.push(parsedInner.slice(0, 1500));
              }
            } catch (e) {
              // 일반 텍스트
              if (typeof cItem.text === "string" && cItem.text.length > 50) {
                organized.raw_text_excerpts.push(cItem.text.slice(0, 1500));
              }
            }
          }
        }
      }
    }

    // (B) instruct_result / structured_result 내의 document_keys 및 extract evidence
    var struct = (cleaned.instruct_result && cleaned.instruct_result.structured_result) || cleaned.structured_result || cleaned;
    if (struct.document_keys) {
      organized.document_keys = struct.document_keys;
    }
    if (struct.date_checks) {
      organized.date_records = struct.date_checks;
    }
    if (struct.document_extract_evidence) {
      organized.extracted_evidence = struct.document_extract_evidence;
    }

    // 만약 documents_extracted가 비어있다면 cleaned 전체를 축약하여 제공
    if (Object.keys(organized.documents_extracted).length === 0) {
      // 1차 비교 매트릭스(comparison_matrix)는 너무 크므로 가볍게 유지
      var fallbackData = Object.assign({}, cleaned);
      if (fallbackData.comparison_matrix && Array.isArray(fallbackData.comparison_matrix)) {
        fallbackData.comparison_matrix = fallbackData.comparison_matrix.map(function (row) {
          return { category: row.category, item: row.check_item_ko || row.check_item, result: row.result };
        });
      }
      return fallbackData;
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
      "4. 답변 출력 형식 (반드시 준수):",
      "   - 결과는 사용자가 한눈에 파악할 수 있도록 마크다운 표(Table) 형태로 정리하여 제공하십시오.",
      "   - 각 표는 명확한 헤더(예: 서류명, 항목, 기재 내용, 일치/검증 결과, 비고 등)를 포함하십시오.",
      "   - 서류 발행 순서, 물류 흐름, 당사자 관계도 등 시각화가 유용한 질문일 경우 Mermaid 다이어그램(```mermaid ... ```)을 적극 활용하여 그림 형태로 도식화하십시오.",
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
      throw new Error("Gemini API Key가 설정되지 않았습니다. API 설정을 확인해주세요.");
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
        "Content-Type": "application/json"
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

    var apiKey = dom.apiKeyInput ? dom.apiKeyInput.value.trim() : DEFAULT_API_KEY;
    if (!apiKey) {
      alert("Gemini API Key를 입력해주세요.");
      if (dom.apiKeyInput) dom.apiKeyInput.focus();
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

  // Mermaid 코드 블록 탐색 및 렌더링
  function renderMermaidDiagrams() {
    if (!window.mermaid || !dom.responseContent) return;

    // <pre><code class="language-mermaid"> 또는 <pre class="mermaid"> 탐색
    var codeBlocks = dom.responseContent.querySelectorAll("code.language-mermaid, pre.mermaid, code.mermaid");
    if (!codeBlocks || codeBlocks.length === 0) return;

    codeBlocks.forEach(function (block, idx) {
      var parent = block.tagName.toLowerCase() === "code" ? block.parentElement : block;
      var rawMermaid = block.textContent.trim();
      var container = document.createElement("div");
      container.className = "mermaid-container";
      container.id = "mermaid-render-" + idx + "-" + Date.now();
      container.textContent = rawMermaid;

      parent.parentNode.replaceChild(container, parent);
    });

    try {
      mermaid.run({
        querySelector: ".mermaid-container"
      });
    } catch (e) {
      console.warn("[LLM] Mermaid 렌더링 오류:", e);
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
