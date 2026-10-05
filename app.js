var CONFIG = null;
var selectedFile = null;
var uploadedFileId = null;
var currentJobId = null;
var currentChecklistData = null;
var activeChecklistTab = null;
var currentRawPayload = null;
var currentCheckItemEvidence = [];
var currentCheckResults = [];
var els = {};
var currentActiveSampleIndex = 1;
var supabaseClient = null;
var currentCustomPdfUrl = null;
var currentExtractDocMap = {};

/* ==========================================================================
   Evidence Field Korean Translation Map (Upstage Studio Agent v14 규격 준수)
   ========================================================================== */
var DOC_TYPE_TO_SCHEMA = {
  lc: "lc_schema",
  commercial_invoice: "commercial_invoice_schema",
  bill_of_lading: "bill_of_lading_schema",
  packing_list: "packing_list_schema",
  certificate_of_origin: "certificate_of_origin_schema",
  marine_cargo_insurance: "marine_cargo_insurance_schema",
  other_document: "other_document_schema"
};

var FIELD_LABELS_KO = {
  // lc_schema
  "lc_schema.document_type": "문서 종류",
  "lc_schema.lc_number": "L/C 번호",
  "lc_schema.reference_number": "참조번호",
  "lc_schema.po_number": "구매주문번호",
  "lc_schema.applicant_name": "신청인명",
  "lc_schema.beneficiary_name": "수익자명",
  "lc_schema.credit_amount": "신용장 금액",
  "lc_schema.currency_code": "통화 코드",
  "lc_schema.expiry_date": "만료일",
  "lc_schema.latest_shipment_date": "최종 선적기한",
  "lc_schema.tolerance_text": "허용오차 문구",
  "lc_schema.tolerance_percent_plus": "상향 허용오차(%)",
  "lc_schema.tolerance_percent_minus": "하향 허용오차(%)",
  "lc_schema.partial_shipment_allowed": "분할선적 허용 여부",
  "lc_schema.transshipment_allowed": "환적 허용 여부",
  "lc_schema.payment_terms": "지급조건",
  "lc_schema.goods_summary": "상품 요약",
  "lc_schema.required_documents.document_name": "요구서류명",
  "lc_schema.required_documents.document_requirement_text": "요구서류 조건",
  // v14 추가 항목 (lc_schema)
  "lc_schema.issue_date": "발행일자",
  "lc_schema.port_of_loading": "선적항",
  "lc_schema.port_of_discharge": "양하항",

  // commercial_invoice_schema
  "commercial_invoice_schema.document_type": "문서 종류",
  "commercial_invoice_schema.invoice_number": "송장 번호",
  "commercial_invoice_schema.reference_number": "참조번호",
  "commercial_invoice_schema.po_number": "구매주문번호",
  "commercial_invoice_schema.lc_number": "L/C 번호",
  "commercial_invoice_schema.seller_name": "판매자명",
  "commercial_invoice_schema.buyer_name": "구매자명",
  "commercial_invoice_schema.invoice_date": "송장일자",
  "commercial_invoice_schema.currency_code": "통화 코드",
  "commercial_invoice_schema.total_amount": "총금액",
  "commercial_invoice_schema.port_of_loading": "선적항",
  "commercial_invoice_schema.port_of_discharge": "양하항",
  "commercial_invoice_schema.payment_terms": "지급조건",
  "commercial_invoice_schema.line_items.product_name": "품목명",
  "commercial_invoice_schema.line_items.quantity": "수량",
  "commercial_invoice_schema.line_items.unit_price": "단가",
  "commercial_invoice_schema.line_items.line_amount": "행 금액",
  "commercial_invoice_schema.line_items.hs_code": "HS 코드",
  // v14 추가 항목 (commercial_invoice_schema)
  "commercial_invoice_schema.hs_code": "HS 코드",

  // bill_of_lading_schema
  "bill_of_lading_schema.document_type": "문서 종류",
  "bill_of_lading_schema.bl_number": "B/L 번호",
  "bill_of_lading_schema.reference_number": "참조번호",
  "bill_of_lading_schema.po_number": "구매주문번호",
  "bill_of_lading_schema.lc_number": "L/C 번호",
  "bill_of_lading_schema.shipper_name": "송하인명",
  "bill_of_lading_schema.consignee_name": "수하인명",
  "bill_of_lading_schema.vessel_name": "선박명",
  "bill_of_lading_schema.port_of_loading": "선적항",
  "bill_of_lading_schema.port_of_discharge": "양하항",
  "bill_of_lading_schema.shipment_date": "선적일",
  "bill_of_lading_schema.on_board_date": "본선적재일",
  "bill_of_lading_schema.total_measurement_cbm": "총 CBM",
  "bill_of_lading_schema.freight_terms": "운임조건",
  "bill_of_lading_schema.cargo_details.cargo_description": "화물 설명",
  "bill_of_lading_schema.cargo_details.package_count": "포장 수량",
  "bill_of_lading_schema.cargo_details.gross_weight": "총중량",
  "bill_of_lading_schema.cargo_details.measurement_cbm": "CBM",
  // v17 B/L 추가 항목
  "bill_of_lading_schema.hs_code": "HS 코드",

  // packing_list_schema
  "packing_list_schema.document_type": "문서 종류",
  "packing_list_schema.packing_list_number": "패킹리스트 번호",
  "packing_list_schema.reference_number": "참조번호",
  "packing_list_schema.po_number": "구매주문번호",
  "packing_list_schema.lc_number": "L/C 번호",
  "packing_list_schema.seller_name": "판매자명",
  "packing_list_schema.buyer_name": "구매자명",
  "packing_list_schema.packing_list_date": "패킹리스트 일자",
  "packing_list_schema.total_package_count": "총 포장 수량",
  "packing_list_schema.total_net_weight": "총 순중량",
  "packing_list_schema.total_gross_weight": "총중량",
  "packing_list_schema.total_measurement_cbm": "총 CBM",
  "packing_list_schema.port_of_loading": "선적항",
  "packing_list_schema.port_of_discharge": "양하항",
  "packing_list_schema.payment_terms": "지급조건",
  "packing_list_schema.line_items.product_name": "품목명",
  "packing_list_schema.line_items.quantity": "수량",
  "packing_list_schema.line_items.package_count": "포장 수량",
  "packing_list_schema.line_items.net_weight": "순중량",
  "packing_list_schema.line_items.gross_weight": "총중량",
  "packing_list_schema.line_items.measurement_cbm": "CBM",
  "packing_list_schema.line_items.hs_code": "HS 코드",
  // v14 추가 항목 (packing_list_schema)
  "packing_list_schema.hs_code": "HS 코드",

  // certificate_of_origin_schema (기본 및 v14 20건 추가)
  "certificate_of_origin_schema.document_type": "문서 종류",
  "certificate_of_origin_schema.certificate_number": "원산지증명서 번호",
  "certificate_of_origin_schema.reference_number": "참조번호",
  "certificate_of_origin_schema.po_number": "구매주문번호",
  "certificate_of_origin_schema.lc_number": "L/C 번호",
  "certificate_of_origin_schema.exporter_name": "수출자명",
  "certificate_of_origin_schema.importer_name": "수입자명",
  "certificate_of_origin_schema.country_of_origin": "원산지 국가",
  "certificate_of_origin_schema.invoice_number": "송장 번호",
  "certificate_of_origin_schema.invoice_date": "송장일자",
  "certificate_of_origin_schema.goods_summary": "상품 요약",
  // v14 추가 항목 (certificate_of_origin_schema)
  "certificate_of_origin_schema.hs_code": "HS 코드",
  "certificate_of_origin_schema.incoterms": "인코텀즈",
  "certificate_of_origin_schema.issue_date": "발행일자",
  "certificate_of_origin_schema.vessel_name": "선박명",
  "certificate_of_origin_schema.marks_numbers": "화인/마크",
  "certificate_of_origin_schema.stamp_present": "직인 날인 여부",
  "certificate_of_origin_schema.voyage_number": "항차 번호",
  "certificate_of_origin_schema.consignee_name": "수하인명",
  "certificate_of_origin_schema.signature_date": "서명일자",
  "certificate_of_origin_schema.signed_by_name": "서명자명",
  "certificate_of_origin_schema.port_of_loading": "선적항",
  "certificate_of_origin_schema.origin_criterion": "원산지 결정기준",
  "certificate_of_origin_schema.total_net_weight": "총 순중량",
  "certificate_of_origin_schema.port_of_discharge": "양하항",
  "certificate_of_origin_schema.total_gross_weight": "총중량",
  "certificate_of_origin_schema.total_package_count": "총 포장 수량",
  "certificate_of_origin_schema.issuing_authority_name": "발급기관명",
  "certificate_of_origin_schema.certification_statement": "증명 문구",
  "certificate_of_origin_schema.copy_original_indicator": "원본/사본 구분",
  "certificate_of_origin_schema.transport_document_number": "운송서류 번호",

  // marine_cargo_insurance_schema (기본 및 v14 1건 추가)
  "marine_cargo_insurance_schema.document_type": "문서 종류",
  "marine_cargo_insurance_schema.policy_certificate_number": "보험증권/증명서 번호",
  "marine_cargo_insurance_schema.policy_issue_date": "보험증권 발행일",
  "marine_cargo_insurance_schema.insured_beneficiary_name": "피보험자/수익자명",
  "marine_cargo_insurance_schema.lc_number": "L/C 번호",
  "marine_cargo_insurance_schema.invoice_number": "송장 번호",
  "marine_cargo_insurance_schema.vessel_name": "선박명",
  "marine_cargo_insurance_schema.voyage_number": "항차 번호",
  "marine_cargo_insurance_schema.port_of_loading": "선적항",
  "marine_cargo_insurance_schema.port_of_discharge": "양하항",
  "marine_cargo_insurance_schema.insured_amount": "부보금액",
  "marine_cargo_insurance_schema.currency_code": "통화 코드",
  "marine_cargo_insurance_schema.coverage_clauses_text": "담보조건 문구",
  "marine_cargo_insurance_schema.claim_payable_text": "보험금 지급지 문구",
  "marine_cargo_insurance_schema.package_count": "포장 수량",
  "marine_cargo_insurance_schema.insured_goods_summary": "보험 목적물 요약",
  "marine_cargo_insurance_schema.marks_numbers": "화인/마크",
  // v14 추가 항목 (marine_cargo_insurance_schema)
  "marine_cargo_insurance_schema.hs_code": "HS 코드",

  // other_document_schema (기본 및 v17 확장 항목)
  "other_document_schema.document_type": "문서 종류",
  "other_document_schema.document_title": "문서 제목",
  "other_document_schema.document_subtitle": "문서 부제",
  "other_document_schema.reference_number": "참조번호",
  "other_document_schema.related_lc_number": "관련 L/C 번호",
  "other_document_schema.related_invoice_number": "관련 송장 번호",
  "other_document_schema.related_bl_number": "관련 B/L 번호",
  "other_document_schema.document_date": "문서 일자",
  "other_document_schema.amount": "금액",
  "other_document_schema.total_amount": "총금액",
  "other_document_schema.payment_due_date": "결제기한",
  "other_document_schema.due_date": "결제기한",
  "other_document_schema.payment_terms": "결제조건",
  "other_document_schema.hs_code": "HS 코드",
  "other_document_schema.port_of_loading": "선적항",
  "other_document_schema.port_of_discharge": "양하항",
  "other_document_schema.goods_summary": "물품 요약",
  "other_document_schema.package_count": "포장 수량",
  "other_document_schema.issuer_or_sender_name": "발행자/발신자명",
  "other_document_schema.receiver_or_beneficiary_name": "수신자/수익자명",
  "other_document_schema.document_summary": "문서 요약"
};

var FIELD_KO_MAP = {
  // 품명 및 물품
  "line_items.product_name": "품목명",
  "product_name": "품목명",
  "goods_description": "물품 명세",
  "description_of_goods": "물품 명세",
  "item_description": "품목 설명",
  "line_items.description": "품목 명세",
  "line_items.quantity": "수량",
  "line_items.unit_price": "단가",
  "line_items.total_amount": "항목 금액",
  "line_items.line_amount": "행 금액",
  "line_items.package_count": "포장 수량",
  "line_items.gross_weight": "총중량",
  "line_items.net_weight": "순중량",
  "line_items.measurement_cbm": "CBM",
  "line_items.hs_code": "HS 코드",

  // 화물 디테일 (B/L 등)
  "cargo_details.cargo_description": "화물 설명",
  "cargo_details.container_no": "컨테이너 번호",
  "cargo_details.seal_no": "봉인 번호",
  "cargo_details.gross_weight": "화물 총중량",
  "cargo_details.measurement": "화물 용적",
  "cargo_details.package_count": "화물 포장개수",
  "cargo_description": "화물 설명",
  
  // 식별 번호
  "lc_number": "L/C 번호",
  "credit_number": "L/C 번호",
  "lc_number_consistency": "신용장 번호 일치성",
  "invoice_number": "송장 번호",
  "invoice_number_consistency": "송장 번호 일치성",
  "bl_number": "B/L 번호",
  "bl_number_reference_consistency": "B/L 번호 참조 일치성",
  "bill_of_lading_number": "B/L 번호",
  "packing_list_number": "패킹리스트 번호",
  "po_number": "구매주문번호",
  "policy_certificate_number": "보험증권/증명서 번호",
  "policy_number": "보험증권 번호",
  "certificate_number": "원산지증명서 번호",
  "reference_number": "참조번호",
  "related_bl_number": "관련 B/L 번호",
  "payment_due_date": "결제기한",
  "due_date": "결제기한",

  // 당사자 정보
  "applicant": "신청인(수입자)",
  "applicant_name": "신청인명",
  "buyer_name": "구매자명",
  "buyer_party_consistency": "수입자/수하인 정보 일치성",
  "consignee": "수하인명",
  "consignee_name": "수하인명",
  "notify_party": "착하통지처",
  "beneficiary": "수익자(수출자)",
  "beneficiary_name": "수익자명",
  "seller_name": "판매자명",
  "exporter_name": "수출자명",
  "importer_name": "수입자명",
  "seller_party_consistency": "수출자/송하인 정보 일치성",
  "shipper": "송하인명",
  "shipper_name": "송하인명",
  "issuing_bank": "개설은행",

  // 날짜
  "lc_issue_date": "신용장 개설일",
  "invoice_date": "송장일자",
  "packing_list_date": "패킹리스트 일자",
  "bl_shipment_date": "선하증권 선적일",
  "bl_on_board_date": "본선적재일",
  "bl_shipment_date_vs_latest_shipment": "선적일 vs 최종선적기한",
  "insurance_policy_issue_date_vs_shipment_date": "보험증권 발행일 vs 선적일",
  "date_flow_timeline": "문서 간 날짜 흐름",
  "shipment_date": "선적일",
  "on_board_date": "본선적재일",
  "latest_shipment_date": "최종 선적기한",
  "insurance_policy_issue_date": "보험증권 발행일",
  "issue_date": "발행일자",
  "date_of_issue": "발행일자",
  "signature_date": "서명일자",

  // 수량, 중량, 용적
  "quantity": "수량",
  "unit_price": "단가",
  "total_amount": "총금액",
  "package_count_consistency": "포장 수량 일치성",
  "gross_weight_consistency": "총중량 일치성",
  "measurement_cbm_consistency": "CBM 일치성",
  "invoice_value": "송장 가액",
  "currency_code": "통화 코드",
  "gross_weight": "총중량",
  "net_weight": "순중량",
  "package_count": "포장 수량",
  "measurement_cbm": "CBM",
  "cbm": "CBM",
  "total_package_count": "총 포장 수량",
  "total_gross_weight": "총중량",
  "total_net_weight": "총 순중량",
  "total_measurement_cbm": "총 CBM",

  // 운송 및 조건
  "port_of_loading": "선적항",
  "port_of_discharge": "양하항",
  "place_of_delivery": "인도지",
  "payment_terms": "지급조건",
  "payment_terms_consistency": "지급조건 일치성",
  "freight_terms": "운임조건",
  "freight_terms_consistency": "운임조건 일치성",
  "incoterms": "인코텀즈",
  "vessel_name": "선박명",
  "voyage_number": "항차 번호",
  "container_number": "컨테이너 번호",
  "seal_number": "봉인 번호",
  "country_of_origin": "원산지 국가",
  "origin_criterion": "원산지 결정기준",
  "hs_code": "HS 코드",
  "hs_code_consistency": "HS 코드 일치성",
  "document_type": "문서 종류",
  "document_title": "문서 제목",
  "file_presence": "서류 구비 현황",
  "required_documents_presence": "L/C 요구서류 충족 여부",
  "insured_amount": "부보금액",
  "insurance_amount": "부보금액",
  "coverage_terms": "담보조건",
  "insurance_clauses": "보험 조항",
  "clauses": "보험 약관"
};

function getFieldLabelKo(schemaName, fieldName) {
  if (!fieldName) return "";
  var fn = String(fieldName).trim();
  if (schemaName) {
    var full = schemaName + "." + fn;
    if (FIELD_LABELS_KO[full]) return FIELD_LABELS_KO[full];
  }
  if (FIELD_LABELS_KO[fn]) return FIELD_LABELS_KO[fn];
  if (FIELD_KO_MAP[fn]) return FIELD_KO_MAP[fn];
  var fnLower = fn.toLowerCase();
  if (FIELD_KO_MAP[fnLower]) return FIELD_KO_MAP[fnLower];
  return fn;
}

/* ==========================================================================
   통합 한글 라벨 변환 엔진 (비교표, 점검항목, 스키마 필드, PDF 뷰어 팝업 100% 한글화)
   ========================================================================== */
var CHECK_ITEM_KO_DICTIONARY = {
  "file_presence": "서류 구비 현황",
  "required_documents_presence": "L/C 요구서류 충족 여부",
  "lc_number_consistency": "신용장(L/C) 번호 일치성",
  "invoice_number_consistency": "송장 번호 일치성",
  "bl_number_reference_consistency": "B/L 번호 참조 일치성",
  "seller_party_consistency": "수출자/송하인 정보 일치성",
  "buyer_party_consistency": "수입자/수하인 정보 일치성",
  "goods_description": "물품 명세 일치성",
  "package_count_consistency": "포장 수량 일치성",
  "gross_weight_consistency": "총중량 일치성",
  "measurement_cbm_consistency": "용적(CBM) 일치성",
  "port_of_loading": "선적항 일치성",
  "port_of_discharge": "양하항 일치성",
  "bl_shipment_date_vs_latest_shipment": "선적일 vs 최종선적기한",
  "insurance_policy_issue_date_vs_shipment_date": "보험증권 발행일 vs 선적일",
  "date_flow_timeline": "문서 간 날짜 흐름",
  "invoice_amount_vs_lc_amount": "송장금액 vs L/C 금액",
  "insurance_amount_vs_lc_requirement": "보험금액 vs L/C 요구조건",
  "vessel_voyage_consistency": "선박/항차 일치성",
  "country_of_origin_consistency": "원산지 정보 일치성",
  "hs_code": "HS 코드 일치성",
  "hs_code_consistency": "HS 코드 일치성",
  "related_lc_number": "관련 L/C 번호",
  "document_title": "문서명",
  "document_type": "문서 종류",
  "document_date": "문서 일자",
  "issuer_or_sender_name": "발행/발송처",
  "receiver_or_beneficiary_name": "수신/수익자",
  "claim_payable_text": "보험금 지급지",
  "payment_terms": "결제 조건",
  "freight_terms": "운임 조건",
  "latest_shipment_date": "최종 선적기한",
  "shipment_date": "선적일",
  "on_board_date": "본선적재일",
  "expiry_date": "유효기일",
  "issue_date": "발행일",
  "total_amount": "총 금액",
  "credit_amount": "신용장 금액",
  "insured_amount": "보험 가입금액",
  "currency_code": "통화 코드",
  "currency": "통화",
  "total_package_count": "총 포장수량",
  "package_count": "포장수량",
  "total_gross_weight": "총중량(Gross)",
  "gross_weight": "총중량",
  "total_net_weight": "순중량(Net)",
  "net_weight": "순중량",
  "total_measurement_cbm": "총 용적(CBM)",
  "measurement_cbm": "용적(CBM)",
  "coverage_clauses_text": "담보 약관",
  "marks_numbers": "화인/화목(Marks)",
  "vessel_name": "선박명(본선명)",
  "voyage_number": "항차(Voyage)"
};

function toKoreanLabel(rawKey, docType) {
  if (!rawKey) return "";
  var s = String(rawKey).trim();

  // 이미 한글이 포함된 경우 (예: "신용장(L/C) 번호 일치성: M0201410ES04828" 등)
  if (/[가-힣]/.test(s)) {
    // 만약 "lc_number_consistency: 가나다" 처럼 영문 키 뒤에 값이 붙은 경우 앞부분만 번역
    if (s.indexOf(":") >= 0) {
      var segs = s.split(":");
      var firstK = segs[0].trim();
      var restV = segs.slice(1).join(":");
      if (!/[가-힣]/.test(firstK)) {
        var koFirst = toKoreanLabel(firstK, docType);
        return koFirst + ":" + restV;
      }
    }
    return s;
  }

  // 콜론(:) 분리 처리 (예: "lc_number_consistency: M0201410ES04828")
  if (s.indexOf(":") >= 0) {
    var parts = s.split(":");
    var kPart = parts[0].trim();
    var vPart = parts.slice(1).join(":").trim();
    var koK = toKoreanLabel(kPart, docType);
    return koK + (vPart ? (": " + vPart) : "");
  }

  var lower = s.toLowerCase().replace(/[\s\-]+/g, "_");
  if (CHECK_ITEM_KO_DICTIONARY[lower]) return CHECK_ITEM_KO_DICTIONARY[lower];
  if (CHECK_ITEM_KO_DICTIONARY[s]) return CHECK_ITEM_KO_DICTIONARY[s];

  if (FIELD_LABELS_KO && FIELD_LABELS_KO[s]) return FIELD_LABELS_KO[s];
  if (FIELD_LABELS_KO && FIELD_LABELS_KO[lower]) return FIELD_LABELS_KO[lower];
  if (FIELD_KO_MAP && FIELD_KO_MAP[s]) return FIELD_KO_MAP[s];
  if (FIELD_KO_MAP && FIELD_KO_MAP[lower]) return FIELD_KO_MAP[lower];

  // schema.field 형태인 경우
  if (s.indexOf(".") >= 0) {
    var pArr = s.split(".");
    var fnOnly = pArr[pArr.length - 1];
    var fnOnlyLower = fnOnly.toLowerCase();
    if (CHECK_ITEM_KO_DICTIONARY[fnOnlyLower]) return CHECK_ITEM_KO_DICTIONARY[fnOnlyLower];
    if (FIELD_KO_MAP && FIELD_KO_MAP[fnOnlyLower]) return FIELD_KO_MAP[fnOnlyLower];
    if (FIELD_LABELS_KO && FIELD_LABELS_KO[fnOnly]) return FIELD_LABELS_KO[fnOnly];
  }

  // docType 스키마 결합 검색
  if (docType) {
    var normDoc = typeof normalizeDocType === "function" ? normalizeDocType(docType) : docType;
    var schema = DOC_TYPE_TO_SCHEMA && (DOC_TYPE_TO_SCHEMA[normDoc] || DOC_TYPE_TO_SCHEMA[docType]);
    if (schema && FIELD_LABELS_KO) {
      if (FIELD_LABELS_KO[schema + "." + s]) return FIELD_LABELS_KO[schema + "." + s];
      if (FIELD_LABELS_KO[schema + "." + lower]) return FIELD_LABELS_KO[schema + "." + lower];
    }
  }

  return s;
}

function getEvidenceFieldLabelKo(docType, fieldName) {
  if (!fieldName) return "";
  var normDoc = typeof normalizeDocType === "function" ? normalizeDocType(docType) : docType;
  var schemaName = DOC_TYPE_TO_SCHEMA[normDoc] || DOC_TYPE_TO_SCHEMA[docType] || (docType ? (docType + "_schema") : "");
  var res = getFieldLabelKo(schemaName, fieldName);
  if (res && res !== fieldName) return res;
  return toKoreanLabel(fieldName, docType);
}

function getKoreanFieldLabel(raw, docType) {
  if (!raw) return "";
  return toKoreanLabel(raw, docType);
}

/**
 * Code.md v5/v7 Contract Helpers:
 * 1) getEvidence: 특정 check_item 및 문서 종류(docType)에 대한 근거(Evidence) 탐색 (check_results 우선, check_item_evidence 보조)
 * 2) canHighlight: Bounding Box 및 페이지 정보가 유효한지 검증 (page > 0, boxes.length > 0 또는 field_name 추출 매핑)
 */
function getEvidence(checkItem, docType) {
  var normDoc = typeof normalizeDocType === "function" ? normalizeDocType(docType) : docType;
  var targetKey = String(checkItem || "").trim();

  // 1순위: 최신 v7/v11 check_results 에서 탐색 (check_item 영문 키 및 label 한국어 둘 다 매칭 지원)
  if (currentCheckResults && currentCheckResults.length) {
    var cRow = currentCheckResults.find(function (x) {
      if (!x) return false;
      return x.check_item === targetKey || x.label === targetKey || x.check_item_ko === targetKey ||
        (x.check_item && targetKey.indexOf(x.check_item) >= 0) ||
        (targetKey && x.check_item && x.check_item.indexOf(targetKey) >= 0);
    });
    if (cRow && cRow.documents) {
      if (cRow.documents[docType]) return cRow.documents[docType];
      var cKeys = Object.keys(cRow.documents);
      for (var i = 0; i < cKeys.length; i++) {
        var ck = cKeys[i];
        var normCk = typeof normalizeDocType === "function" ? normalizeDocType(ck) : ck;
        if (normCk === normDoc || ck.indexOf(normDoc) >= 0 || normDoc.indexOf(ck) >= 0) {
          return cRow.documents[ck];
        }
      }
    }
  }

  // 2순위: check_item_evidence 에서 탐색 (check_item 및 check_item_ko 매칭)
  if (currentCheckItemEvidence && currentCheckItemEvidence.length) {
    var row = currentCheckItemEvidence.find(function (x) {
      if (!x) return false;
      return x.check_item === targetKey || x.check_item_ko === targetKey ||
        (x.check_item && targetKey.indexOf(x.check_item) >= 0) ||
        (targetKey && x.check_item && x.check_item.indexOf(targetKey) >= 0);
    });
    if (row && row.documents) {
      if (row.documents[docType]) return row.documents[docType];
      var keys = Object.keys(row.documents);
      for (var j = 0; j < keys.length; j++) {
        var k = keys[j];
        var normK = typeof normalizeDocType === "function" ? normalizeDocType(k) : k;
        if (normK === normDoc || k.indexOf(normDoc) >= 0 || normDoc.indexOf(k) >= 0) {
          return row.documents[k];
        }
      }
    }
  }

  // 3순위: document_extract_evidence 에서 탐색 (v17 HS Code, B/L hs_code, other_document 등)
  var rawStructured = currentRawPayload && (currentRawPayload.structured_result || (currentRawPayload.instruct_result && currentRawPayload.instruct_result.structured_result));
  var docExtractEv = (rawStructured && rawStructured.document_extract_evidence) || {};
  var docHit = docExtractEv[normDoc] || docExtractEv[docType];
  if (docHit) {
    var fHit = docHit[targetKey] || (targetKey === "hs_code_consistency" ? docHit.hs_code : null);
    if (!fHit && (targetKey === "hs_code" || targetKey === "hs_code_consistency")) {
      fHit = docHit.hs_code || docHit["line_items.hs_code"];
    }
    if (!fHit && targetKey === "goods_description") {
      fHit = docHit.goods_summary || docHit.cargo_description || docHit.item_description;
    }
    if (fHit) {
      return {
        value: typeof fHit === "object" ? fHit.value : fHit,
        field_name: (typeof fHit === "object" && fHit.field_name) ? fHit.field_name : targetKey,
        source: normalizeSource(fHit.source || fHit.evidence || fHit)
      };
    }
  }

  return null;
}

/**
 * 신용장 서류 하이라이트 좌표 연동 명세서 준수:
 * 1) polygonToBox: polygon 4점 배열 [{x, y}, ...]을 bbox {x, y, width, height}로 변환 (0~1 normalized)
 * 2) normalizeSource: coordinates(다각형) 또는 boxes(박스) 입력을 표준 { page, boxes } 형태로 통일
 * 3) toPixelBox: normalized box를 렌더된 캔버스/페이지 크기 기준 픽셀로 변환
 */
function polygonToBox(points) {
  if (!points || !points.length) return null;
  var xs = points.map(function (p) { return p.x; });
  var ys = points.map(function (p) { return p.y; });
  var minX = Math.min.apply(null, xs);
  var maxX = Math.max.apply(null, xs);
  var minY = Math.min.apply(null, ys);
  var maxY = Math.max.apply(null, ys);

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}

function normalizeSource(source) {
  if (!source) return null;
  var page = typeof source.page === "number" ? source.page : -1;
  var boxes = [];

  // 1순위: word_coordinates (실제 텍스트 토큰 단위 정밀 폴리곤 - 단일 통합 BBox 생성)
  if (Array.isArray(source.word_coordinates) && source.word_coordinates.length > 0) {
    var allPts = [];
    source.word_coordinates.forEach(function (poly) {
      if (Array.isArray(poly)) {
        poly.forEach(function (pt) {
          if (pt && typeof pt.x === "number" && typeof pt.y === "number") {
            allPts.push(pt);
          }
        });
      }
    });
    if (allPts.length > 0) {
      var wb = polygonToBox(allPts);
      if (wb) boxes.push(wb);
    }
  } else if (Array.isArray(source.boxes) && source.boxes.length > 0) {
    boxes = source.boxes;
  } else if (Array.isArray(source.coordinates) && source.coordinates.length > 0) {
    // 4점 polygon 배열인 경우 bbox 변환
    var b = polygonToBox(source.coordinates);
    if (b) boxes.push(b);
  }

  if (page <= 0 || boxes.length === 0) return null;
  return {
    page: page,
    boxes: boxes
  };
}

function toPixelBox(box, pageWidth, pageHeight) {
  if (!box) return null;
  return {
    left: box.x * pageWidth,
    top: box.y * pageHeight,
    width: box.width * pageWidth,
    height: box.height * pageHeight
  };
}

function canHighlight(evidenceDoc, docType, checkItemKey) {
  if (!evidenceDoc) return false;
  var normSrc = normalizeSource(evidenceDoc.source);
  return !!(normSrc && normSrc.page > 0 && normSrc.boxes.length > 0);
}

function getEvidenceTarget(sampleIdx, docType, evidenceDoc, checkItemKey) {
  if (!evidenceDoc) return null;
  var normSrc = normalizeSource(evidenceDoc.source);
  if (normSrc && normSrc.page > 0 && normSrc.boxes.length > 0) {
    var rawField = evidenceDoc.field_name || checkItemKey || "";
    var koField = toKoreanLabel(rawField, docType);
    var valSnippet = (evidenceDoc.value != null && String(evidenceDoc.value).trim() !== "")
      ? (": " + String(evidenceDoc.value).slice(0, 35))
      : "";
    return {
      page: normSrc.page,
      box: normSrc.boxes[0],
      boxes: normSrc.boxes,
      label: koField + valSnippet
    };
  }
  return null;
}

function getEl(id) {
  return document.getElementById(id);
}

function initElements() {
  els.apiKey = getEl("apiKey");
  els.workerUrl = getEl("workerUrl");
  els.configId = getEl("configId");
  els.forceRefreshBtn = getEl("forceRefreshBtn");
  els.themeToggleBtn = getEl("themeToggleBtn");
  els.themeIcon = getEl("themeIcon");
  els.themeLabel = getEl("themeLabel");
  els.fileInput = getEl("fileInput");
  els.dropzone = getEl("dropzone");
  els.fileInfo = getEl("fileInfo");
  els.runBtn = getEl("runBtn");
  els.sampleBtn = getEl("sampleBtn");
  els.sampleBtn1 = getEl("sampleBtn1");
  els.sampleBtn2 = getEl("sampleBtn2");
  els.sampleBtn3 = getEl("sampleBtn3");
  els.sampleBtn4 = getEl("sampleBtn4");
  els.sampleSelect = getEl("sampleSelect");
  els.clearBtn = getEl("clearBtn");
  els.lookupJobId = getEl("lookupJobId");
  els.lookupBtn = getEl("lookupBtn");
  els.jobStatus = getEl("jobStatus");
  els.jobMeta = getEl("jobMeta");
  els.overallStatus = getEl("overallStatus");
  els.overallStatusCard = getEl("overallStatusCard");
  els.overallStatusDesc = getEl("overallStatusDesc");
  els.alertLevel = getEl("alertLevel");
  els.alertLevelCard = getEl("alertLevelCard");
  els.alertLevelDesc = getEl("alertLevelDesc");
  els.recommendedAction = getEl("recommendedAction");
  els.recommendedActionCard = getEl("recommendedActionCard");
  els.oneLineSummary = getEl("oneLineSummary");
  els.usageCard = getEl("usageCard");
  els.usageStepName = getEl("usageStepName");
  els.usageInputTokens = getEl("usageInputTokens");
  els.usageOutputTokens = getEl("usageOutputTokens");
  els.usageTotalTokens = getEl("usageTotalTokens");
  els.comparisonTableBody = getEl("comparisonTableBody");
  els.comparisonCardsContainer = getEl("comparisonCardsContainer");
  els.comparisonTableWrap = getEl("comparisonTableWrap");
  els.viewCardBtn = getEl("viewCardBtn");
  els.viewTableBtn = getEl("viewTableBtn");
  els.documentKeys = getEl("documentKeys");
  els.dateTimeline = getEl("dateTimeline");
  els.checklistTabs = getEl("checklistTabs");
  els.checklistContent = getEl("checklistContent");
  els.copyJsonBtn = getEl("copyJsonBtn");
  els.downloadJsonBtn = getEl("downloadJsonBtn");
  els.rawJson = getEl("rawJson");

  /* Document Viewer Floating Window Elements */
  els.openDocViewerBtn = getEl("openDocViewerBtn");
  els.docViewerBackdrop = getEl("docViewerBackdrop");
  els.docViewerFloating = getEl("docViewerFloating");
  els.mobileSwipeHandleBar = getEl("mobileSwipeHandleBar");
  els.docViewerHeader = getEl("docViewerHeader");
  els.viewerCloseBtn = getEl("viewerCloseBtn");
  els.viewerMobileBottomBar = getEl("viewerMobileBottomBar");
  els.viewerMobileCloseBtn = getEl("viewerMobileCloseBtn");
  els.viewerDockBtn = getEl("viewerDockBtn");
  els.viewerMaxBtn = getEl("viewerMaxBtn");
  els.docViewerResizer = getEl("docViewerResizer");
  els.viewerDocBadge = getEl("viewerDocBadge");
  els.viewerDocTitle = getEl("viewerDocTitle");
  els.viewerPageIndicator = getEl("viewerPageIndicator");
  els.viewerPrevPageBtn = getEl("viewerPrevPageBtn");
  els.viewerNextPageBtn = getEl("viewerNextPageBtn");
  els.viewerPageInput = getEl("viewerPageInput");
  els.viewerTotalPages = getEl("viewerTotalPages");
  els.viewerZoomInBtn = getEl("viewerZoomInBtn");
  els.viewerZoomOutBtn = getEl("viewerZoomOutBtn");
  els.viewerFitWidthBtn = getEl("viewerFitWidthBtn");
  els.viewerZoomLabel = getEl("viewerZoomLabel");
  els.viewerToggleHighlightBtn = getEl("viewerToggleHighlightBtn");
  els.docQuickNav = getEl("docQuickNav");
  els.viewerHighlightBanner = getEl("viewerHighlightBanner");
  els.viewerHighlightTargetText = getEl("viewerHighlightTargetText");
  els.docViewerBody = getEl("docViewerBody");
  els.docPageStage = getEl("docPageStage");
  els.pdfCanvas = getEl("pdfCanvas");
  els.highlightLayer = getEl("highlightLayer");
  els.viewerLoadingSpinner = getEl("viewerLoadingSpinner");
}

function escapeHtml(value) {
  var str = String(value == null ? "" : value);
  str = str.replace(/&/g, "&amp;");
  str = str.replace(/</g, "&lt;");
  str = str.replace(/>/g, "&gt;");
  str = str.replace(/"/g, "&quot;");
  str = str.replace(/'/g, "&#039;");
  return str;
}

/* Remove raw citation markers like 【†16】, [†80], 【80】 */
function cleanText(value) {
  if (value == null) return "";
  var str = String(value);
  str = str.replace(/【†?\d+】/g, "").replace(/\[†?\d+\]/g, "");
  return str.trim();
}

function trimValue(value) {
  return String(value == null ? "" : value).replace(/^\s+|\s+$/g, "");
}

function getCacheBuster() {
  var url = new URL(window.location.href);
  return url.searchParams.get("v") || String(Date.now());
}

/* Theme Toggle */
function initTheme() {
  var savedTheme = localStorage.getItem("theme") || "light";
  setTheme(savedTheme);

  if (els.themeToggleBtn) {
    els.themeToggleBtn.addEventListener("click", function () {
      var currentTheme = document.documentElement.getAttribute("data-theme") || "light";
      var nextTheme = currentTheme === "light" ? "dark" : "light";
      setTheme(nextTheme);
    });
  }
}

function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);

  if (els.themeIcon && els.themeLabel) {
    if (theme === "dark") {
      els.themeIcon.innerHTML = '<i class="bi bi-moon-stars-fill"></i>';
      els.themeLabel.textContent = "어두운 화면";
    } else {
      els.themeIcon.innerHTML = '<i class="bi bi-sun-fill"></i>';
      els.themeLabel.textContent = "밝은 화면";
    }
  }
}

/* API Endpoint Construction via Cloudflare Worker with Direct Upstage Fallback */
function getApiEndpoint(path) {
  var workerBase = trimValue(els.workerUrl ? els.workerUrl.value : "") || (CONFIG ? CONFIG.workerUrl : "");
  if (!workerBase) {
    workerBase = "https://bong.gehunmin19.workers.dev";
  }
  
  if (!/^https?:\/\//i.test(workerBase)) {
    workerBase = "https://" + workerBase;
  }

  workerBase = workerBase.replace(/\/+$/, "");

  // 모바일 오타/잘림 자동 보정 (예: 'workers.' 또는 'workers' 로 끝난 경우 .dev 자동 보완)
  if (workerBase.endsWith("workers.") || workerBase.endsWith("workers")) {
    workerBase = workerBase.replace(/workers\.?$/, "workers.dev");
  }

  if (!workerBase.endsWith("/v2") && !workerBase.endsWith("/v1")) {
    return workerBase + "/v2" + path;
  }
  return workerBase + path;
}

function getDirectApiEndpoint(path) {
  var base = (CONFIG && CONFIG.baseUrl) || "https://api.upstage.ai/v2";
  base = base.replace(/\/+$/, "");
  return base + path;
}

function setStatus(text, meta) {
  els.jobStatus.textContent = text || "";
  els.jobMeta.textContent = meta || "";
}

function koreanStatus(statusStr) {
  if (!statusStr) return "-";
  var s = String(statusStr).toLowerCase().trim();

  // Overall & Alert levels
  if (s === "review_required" || s === "review required") return "검토 필요";
  if (s === "proceed") return "진행 가능";
  if (s === "on_hold" || s === "on hold") return "보류";
  if (s === "critical") return "치명";
  if (s === "warning" || s === "warn") return "주의";
  if (s === "info") return "참고";

  // Matrix/Checklist results
  if (s === "match" || s === "ok") return "일치";
  if (s === "mismatch") return "불일치";
  if (s === "missing") return "미제출";
  if (s === "unclear") return "확인 필요";
  if (s === "pass") return "통과";
  if (s === "fail" || s === "crit") return "미비";
  if (s === "not_available" || s === "n/a") return "미해당";
  if (s === "present") return "구비됨";

  return statusStr;
}

function formatDocValue(val) {
  if (val == null) return "-";
  var str = cleanText(val);
  var lower = str.toLowerCase().trim();
  if (lower === "present") return "구비됨";
  if (lower === "missing") return "미제출";
  if (lower === "not_available" || lower === "n/a") return "미해당";
  if (lower === "match") return "일치";
  if (lower === "mismatch") return "불일치";
  if (lower === "unclear") return "확인 필요";
  return str;
}

function formatTableCellHtml(val) {
  if (val == null || val === "" || val === "-") {
    return '<span class="cell-val cell-val-subtle">-</span>';
  }
  var str = cleanText(val);
  var lower = str.toLowerCase().trim();

  if (lower === "present" || lower === "구비됨") {
    return '<span class="cell-val cell-val-ok"><i class="bi bi-check-circle-fill"></i> 구비됨</span>';
  }
  if (lower === "match" || lower === "일치") {
    return '<span class="cell-val cell-val-ok"><i class="bi bi-check-lg"></i> 일치</span>';
  }
  if (lower === "missing" || lower === "미제출") {
    return '<span class="cell-val cell-val-crit"><i class="bi bi-x-circle-fill"></i> 미제출</span>';
  }
  if (lower === "mismatch" || lower === "불일치") {
    return '<span class="cell-val cell-val-crit"><i class="bi bi-exclamation-octagon-fill"></i> 불일치</span>';
  }
  if (lower === "unclear" || lower === "확인 필요" || lower === "확인필요") {
    return '<span class="cell-val cell-val-warn"><i class="bi bi-question-circle-fill"></i> 확인필요</span>';
  }
  if (lower === "not_available" || lower === "n/a" || lower === "미해당") {
    return '<span class="cell-val cell-val-subtle">미해당</span>';
  }
  if (str.indexOf("?") >= 0) {
    return '<span class="cell-val cell-val-warn" title="OCR 판독 불명확"><i class="bi bi-question-diamond"></i> ' + escapeHtml(str) + '</span>';
  }

  return '<span class="cell-val cell-val-text">' + escapeHtml(str) + '</span>';
}

function formatMultiSentenceHtml(text) {
  if (!text || text === "-") return "-";
  var cleaned = cleanText(text).trim();
  if (!cleaned || cleaned === "-") return "-";

  // Check if text has multiple sentences or newlines
  var rawLines = cleaned.split(/\r?\n+/);
  var sentences = [];

  rawLines.forEach(function (line) {
    line = line.trim();
    if (!line) return;
    // Split sentences: period followed by space and not immediately followed by digit/lowercase
    var parts = line.split(/(?<=[가-힣a-zA-Z0-9\)\'\"\]])\.\s+/);
    parts.forEach(function (p, idx) {
      p = p.trim();
      if (!p) return;
      // Add period back if missing at end of part
      if (idx < parts.length - 1 && !/[.!?]$/.test(p)) {
        p += ".";
      }
      sentences.push(p);
    });
  });

  if (sentences.length <= 1) {
    return '<div class="sentence-single">' + escapeHtml(sentences[0] || cleaned) + '</div>';
  }

  var html = '<div class="sentence-list">';
  sentences.forEach(function (s) {
    var hasPrefix = /^([0-9]+[\.\)]|[-*•])\s*/.test(s);
    if (hasPrefix) {
      html += '<div class="sentence-item sentence-numbered"><span class="sentence-text">' + escapeHtml(s) + '</span></div>';
    } else {
      html += '<div class="sentence-item"><span class="sentence-bullet">•</span><span class="sentence-text">' + escapeHtml(s) + '</span></div>';
    }
  });
  html += '</div>';
  return html;
}

function badgeClass(result) {
  var v = String(result || "").toLowerCase();

  if (
    v.indexOf("일치") >= 0 ||
    v.indexOf("진행") >= 0 ||
    v.indexOf("통과") >= 0 ||
    v.indexOf("구비") >= 0 ||
    v === "match" ||
    v === "ok" ||
    v === "proceed" ||
    v === "pass" ||
    v === "present"
  ) {
    return "badge badge-ok";
  }
  if (
    v.indexOf("검토") >= 0 ||
    v.indexOf("주의") >= 0 ||
    v.indexOf("확인") >= 0 ||
    v.indexOf("warning") >= 0 ||
    v === "review_required" ||
    v === "unclear" ||
    v === "warn"
  ) {
    return "badge badge-warn";
  }
  if (
    v.indexOf("불일치") >= 0 ||
    v.indexOf("보류") >= 0 ||
    v.indexOf("치명") >= 0 ||
    v.indexOf("미제출") >= 0 ||
    v.indexOf("미비") >= 0 ||
    v.indexOf("critical") >= 0 ||
    v === "mismatch" ||
    v === "on_hold" ||
    v === "missing" ||
    v === "fail"
  ) {
    return "badge badge-crit";
  }
  return "badge badge-neutral";
}

function resultCellClass(result) {
  var v = String(result || "").toLowerCase();
  if (
    v.indexOf("일치") >= 0 ||
    v.indexOf("진행") >= 0 ||
    v.indexOf("통과") >= 0 ||
    v.indexOf("구비") >= 0 ||
    v === "match" ||
    v === "ok" ||
    v === "proceed" ||
    v === "pass" ||
    v === "present"
  ) {
    return "res-cell res-cell-ok";
  }
  if (
    v.indexOf("검토") >= 0 ||
    v.indexOf("주의") >= 0 ||
    v.indexOf("확인") >= 0 ||
    v.indexOf("warning") >= 0 ||
    v === "review_required" ||
    v === "unclear" ||
    v === "warn"
  ) {
    return "res-cell res-cell-warn";
  }
  if (
    v.indexOf("불일치") >= 0 ||
    v.indexOf("보류") >= 0 ||
    v.indexOf("치명") >= 0 ||
    v.indexOf("미제출") >= 0 ||
    v.indexOf("미비") >= 0 ||
    v.indexOf("critical") >= 0 ||
    v === "mismatch" ||
    v === "on_hold" ||
    v === "missing" ||
    v === "fail"
  ) {
    return "res-cell res-cell-crit";
  }
  return "res-cell res-cell-neutral";
}

function rowHighlightClass(result) {
  var v = String(result || "").toLowerCase();

  if (
    v.indexOf("불일치") >= 0 ||
    v.indexOf("보류") >= 0 ||
    v.indexOf("치명") >= 0 ||
    v.indexOf("미제출") >= 0 ||
    v.indexOf("미비") >= 0 ||
    v.indexOf("critical") >= 0 ||
    v === "mismatch" ||
    v === "missing" ||
    v === "fail" ||
    v === "on_hold"
  ) {
    return "row-crit";
  }
  if (
    v.indexOf("검토") >= 0 ||
    v.indexOf("주의") >= 0 ||
    v.indexOf("확인") >= 0 ||
    v.indexOf("warning") >= 0 ||
    v === "review_required" ||
    v === "unclear" ||
    v === "warn"
  ) {
    return "row-warn";
  }
  return "";
}

function applyCardTheme(cardEl, themeClass) {
  if (!cardEl) return;
  cardEl.classList.remove("card-theme-warn", "card-theme-crit", "card-theme-ok", "card-theme-neutral");
  if (themeClass) {
    cardEl.classList.add(themeClass);
  }
}

function clearResult() {
  applyCardTheme(els.overallStatusCard, null);
  applyCardTheme(els.alertLevelCard, null);
  applyCardTheme(els.recommendedActionCard, null);
  uploadedFileId = null;
  currentJobId = null;
  if (els.overallStatus) els.overallStatus.style.display = "none";
  els.overallStatusDesc.textContent = "결과 없음";
  if (els.alertLevel) els.alertLevel.style.display = "none";
  els.alertLevelDesc.textContent = "결과 없음";
  els.recommendedAction.textContent = "결과 없음";
  els.oneLineSummary.textContent = "결과 없음";
  if (els.usageCard) els.usageCard.style.display = "none";
  els.documentKeys.innerHTML = "결과 없음";
  if (els.dateTimeline) els.dateTimeline.innerHTML = "결과 없음";
  var hb = document.getElementById("timelineHeaderBadge");
  if (hb) hb.innerHTML = "";
  if (els.comparisonTableBody) els.comparisonTableBody.innerHTML = '<div class="empty-cell">결과 없음</div>';
  if (els.comparisonCardsContainer) els.comparisonCardsContainer.innerHTML = '<div class="empty-cell">결과 없음</div>';
  if (els.checklistTabs) els.checklistTabs.innerHTML = "";
  if (els.checklistContent) els.checklistContent.innerHTML = '<div class="empty-cell">결과 없음</div>';
  els.rawJson.textContent = "결과 없음";
  currentChecklistData = null;
  activeChecklistTab = null;
  currentRawPayload = null;
  setStatus("대기 중", "");
}

function clearAll() {
  selectedFile = null;
  if (els.fileInput) els.fileInput.value = "";
  if (els.sampleSelect) els.sampleSelect.value = "";
  if (els.fileInfo) els.fileInfo.textContent = "선택된 파일 없음";
  clearResult();
}

/**
 * [방법 B: Normalizer Lookup]
 * Upstage Agent API include: ["all"] 호출 시 반환되는 step_extract의 정밀 OCR additional_values와
 * step_instruct의 check_item_evidence (field_name)를 1:1로 매핑하여 100% 정밀 BBox를 자동 결합합니다.
 */
function enrichEvidenceWithOcrCoordinates(extractResult, structuredResult) {
  if (!extractResult || !structuredResult) return;

  var docs = extractResult.documents || (extractResult.result && extractResult.result.documents) || [];
  if (!Array.isArray(docs) || docs.length === 0) return;

  // 1. 서류 타입별 additional_values 룩업 테이블 구축
  var extractDocMap = {};
  docs.forEach(function (d) {
    if (!d) return;
    var dt = String(d.document_type || d.schema_name || "").toLowerCase().replace(/_schema$/, "").trim();
    if (!extractDocMap[dt]) extractDocMap[dt] = {};
    if (d.schema_name) {
      var sn = String(d.schema_name).toLowerCase().replace(/_schema$/, "").trim();
      if (!extractDocMap[sn]) extractDocMap[sn] = {};
    }
    var addVals = d.additional_values || {};
    Object.keys(addVals).forEach(function (k) {
      extractDocMap[dt][k] = addVals[k];
      if (d.schema_name) {
        var sn = String(d.schema_name).toLowerCase().replace(/_schema$/, "").trim();
        extractDocMap[sn][k] = addVals[k];
      }
    });
  });

  currentExtractDocMap = extractDocMap;

  // 문서 타입 매칭 헬퍼 (별칭 및 한글/영문 매핑 통합)
  function findDocAddVals(docKey) {
    var rawKey = String(docKey || "").toLowerCase().trim();
    var normKey = typeof normalizeDocType === "function" ? normalizeDocType(rawKey) : rawKey.replace(/[\s\-_]+/g, "");
    if (extractDocMap[normKey]) return extractDocMap[normKey];
    if (extractDocMap[rawKey]) return extractDocMap[rawKey];

    var aliasMap = {
      lc: ["letterofcredit", "lc", "loc", "신용장"],
      bill_of_lading: ["bl", "billoflading", "bol", "선하증권", "선하증권bl", "선하증권b/l"],
      commercial_invoice: ["commercialinvoice", "invoice", "inv", "ci", "상업송장", "송장"],
      packing_list: ["packinglist", "pl", "packing", "패킹리스트", "포장명세서"],
      marine_cargo_insurance: ["marinecargoinsurance", "insurance", "cargoinsurance", "policy", "해상적하보험증권", "보험증권", "해상보험"],
      certificate_of_origin: ["certificateoforigin", "coo", "co", "원산지증명서"],
      other_document: ["otherdocument", "other", "기타문서", "기타"]
    };

    var matchedGroup = null;
    for (var gKey in aliasMap) {
      if (gKey === normKey || aliasMap[gKey].indexOf(normKey) >= 0) {
        matchedGroup = gKey;
        break;
      }
    }

    var keys = Object.keys(extractDocMap);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var kNorm = k.replace(/[\s\-_]+/g, "");
      if (k === normKey || kNorm === normKey || k.indexOf(normKey) >= 0 || normKey.indexOf(k) >= 0) {
        return extractDocMap[k];
      }
      if (matchedGroup && (matchedGroup === k || matchedGroup === kNorm || aliasMap[matchedGroup].indexOf(kNorm) >= 0)) {
        return extractDocMap[k];
      }
    }
    return null;
  }

  // BBox 좌표를 0~1 normalized Box로 변환하는 헬퍼 (locations, coordinates 폴리곤, bbox 지원)
  function convertOcrLocationToBox(matchedVal) {
    if (!matchedVal) return null;
    var page = typeof matchedVal.page === "number" && matchedVal.page > 0 ? matchedVal.page : 1;
    var boxes = [];

    // 1순위: word_coordinates (최우선: 실제 텍스트 토큰 단위 정밀 BBox - Upstage Studio UI 기준)
    if (Array.isArray(matchedVal.word_coordinates) && matchedVal.word_coordinates.length > 0) {
      var allPts = [];
      matchedVal.word_coordinates.forEach(function (poly) {
        if (Array.isArray(poly)) {
          poly.forEach(function (pt) {
            if (pt && typeof pt.x === "number" && typeof pt.y === "number") {
              allPts.push(pt);
            }
          });
        }
      });
      if (allPts.length > 0) {
        var wordBox = polygonToBox(allPts);
        if (wordBox) boxes.push(wordBox);
      }
    } else if (matchedVal.locations || (Array.isArray(matchedVal) && matchedVal[0] && matchedVal[0].locations)) {
      // 2순위: locations
      var locs = matchedVal.locations || matchedVal[0].locations;
      if (locs && locs.length) {
        var firstLoc = locs[0];
        page = typeof firstLoc.page === "number" ? firstLoc.page : page;
        var bbox = firstLoc.bbox; // [x1, y1, x2, y2]
        if (Array.isArray(bbox) && bbox.length >= 4) {
          var isNormalized = bbox[2] <= 1.05 && bbox[3] <= 1.05 && bbox[0] >= 0 && bbox[1] >= 0;
          var wDoc = isNormalized ? 1 : 595.28;
          var hDoc = isNormalized ? 1 : 841.89;
          var x1 = bbox[0] / wDoc;
          var y1 = bbox[1] / hDoc;
          var x2 = bbox[2] / wDoc;
          var y2 = bbox[3] / hDoc;
          boxes.push({
            x: Math.min(x1, x2),
            y: Math.min(y1, y2),
            width: Math.abs(x2 - x1),
            height: Math.abs(y2 - y1)
          });
        }
      }
    } else if (Array.isArray(matchedVal.bbox) && matchedVal.bbox.length >= 4) {
      // 3순위: bbox
      var bx1 = Number(matchedVal.bbox[0]);
      var by1 = Number(matchedVal.bbox[1]);
      var bx2 = Number(matchedVal.bbox[2]);
      var by2 = Number(matchedVal.bbox[3]);
      boxes.push({
        x: Math.min(bx1, bx2),
        y: Math.min(by1, by2),
        width: Math.abs(bx2 - bx1),
        height: Math.abs(by2 - by1)
      });
    } else if (Array.isArray(matchedVal.coordinates) && matchedVal.coordinates.length > 0) {
      // 4순위: coordinates (블록/영역 폴리곤 폴백)
      var polyBox = polygonToBox(matchedVal.coordinates);
      if (polyBox) boxes.push(polyBox);
    }

    if (boxes.length === 0) return null;

    var txt = matchedVal._value != null ? String(matchedVal._value) : (matchedVal.value != null ? String(matchedVal.value) : "");
    return {
      page: page,
      boxes: boxes,
      text: txt
    };
  }

  // 2. check_item_evidence 순회 및 source 주입 (규칙 2, 3, 4 준수)
  var evidenceList = structuredResult.check_item_evidence || [];
  var generatedCheckResults = [];

  evidenceList.forEach(function (row) {
    if (!row || !row.documents) return;
    var crDocMap = {};
    var isFilePresence = row.check_item === "file_presence" ||
                         row.check_item === "required_documents_presence" ||
                         (row.check_item_ko && (row.check_item_ko.indexOf("서류 구비") >= 0 || row.check_item_ko.indexOf("서류구비") >= 0));

    // 기타(도착통지서 등) 문서가 실제 추출 문서에 존재하지만 row.documents에 없는 경우 보강
    if (isFilePresence && !row.documents.other_document) {
      var otherAddVals = findDocAddVals("other_document");
      if (otherAddVals) {
        row.documents.other_document = {
          field_name: "document_title",
          value: "present"
        };
      }
    }

    Object.keys(row.documents).forEach(function (docKey) {
      var docEv = row.documents[docKey];
      if (!docEv) return;
      var fName = docEv.field_name;
      var addVals = findDocAddVals(docKey);
      var matchedVal = null;

      // 🌟 사용자 코멘트 2 반영:
      // 서류구비현황(file_presence) 항목은 Key No 대신 서류 종류(document_type / document_title)를 타깃으로 하이라이트
      if (isFilePresence) {
        fName = "document_type";
        docEv.field_name = "document_type";
        if (addVals) {
          matchedVal = (addVals["document_type"] && addVals["document_type"].page > 0 ? addVals["document_type"] : null) ||
                       addVals["document_title"] ||
                       addVals["document_type"];
        }
      } else if (addVals && fName) {
        if (fName.indexOf(".") >= 0) {
          // 규칙 3: 테이블 항목 (예: line_items.product_name, cargo_details.cargo_description)
          var parts = fName.split(".");
          var tblName = parts[0];
          var colName = parts[1];
          var rows = Array.isArray(addVals[fName]) ? addVals[fName] : (Array.isArray(addVals[tblName]) ? addVals[tblName] : null);

          if (rows && rows.length > 0) {
            var targetNorm = docEv.value != null ? String(docEv.value).toLowerCase().replace(/\s+/g, " ").trim() : "";
            var selectedRow = null;

            // 규칙 4 1순위: exact normalized match between evidence.value and row.value
            if (targetNorm) {
              for (var ri = 0; ri < rows.length; ri++) {
                var r = rows[ri];
                var cCandidate = (r && typeof r === "object" && colName in r) ? r[colName] : r;
                var cVal = (cCandidate && typeof cCandidate === "object")
                  ? (cCandidate._value != null ? cCandidate._value : cCandidate.value)
                  : cCandidate;
                if (cVal != null && String(cVal).toLowerCase().replace(/\s+/g, " ").trim() === targetNorm) {
                  selectedRow = cCandidate;
                  break;
                }
              }
            }

            // 규칙 4 2순위: fallback to first row
            if (!selectedRow) {
              var firstR = rows[0];
              selectedRow = (firstR && typeof firstR === "object" && colName in firstR) ? firstR[colName] : firstR;
            }

            matchedVal = selectedRow;
          }
        } else {
          // 규칙 2: 스칼라 필드 단일 객체 매핑
          matchedVal = addVals[fName];
        }
      }

      if (matchedVal) {
        var src = convertOcrLocationToBox(matchedVal);
        if (src) {
          docEv.source = src;
        }
      }

      if (isFilePresence) {
        var docNameStr = (matchedVal && (matchedVal._value || matchedVal.value)) || "구비됨";
        docEv.value = "present";
        crDocMap[docKey] = {
          field_name: "document_type",
          label: docNameStr,
          value: "present",
          source: docEv.source || null
        };
      } else {
        crDocMap[docKey] = {
          field_name: fName,
          value: docEv.value,
          source: docEv.source || null
        };
      }
    });

    generatedCheckResults.push({
      check_item: row.check_item,
      label: row.check_item_ko || row.check_item,
      documents: crDocMap
    });
  });

  // check_results가 없거나 비어있는 경우 자동 생성 주입
  if (!structuredResult.check_results || structuredResult.check_results.length === 0) {
    structuredResult.check_results = generatedCheckResults;
  }

  // 3. document_extract_evidence 순회 및 source 주입
  if (structuredResult.document_extract_evidence) {
    Object.keys(structuredResult.document_extract_evidence).forEach(function (docKey) {
      var docGroup = structuredResult.document_extract_evidence[docKey];
      if (!docGroup || typeof docGroup !== "object") return;
      var addVals = findDocAddVals(docKey);
      if (!addVals) return;

      Object.keys(docGroup).forEach(function (fKey) {
        var item = docGroup[fKey];
        if (!item) return;
        var fieldName = item.field_name || fKey;
        var matchedVal = addVals[fieldName] || addVals[fKey];
        if (matchedVal) {
          var src = convertOcrLocationToBox(matchedVal);
          if (src) item.source = src;
        }
      });
    });
  }
}

function normalizeResultPayload(parsed) {
  if (!parsed) return {};
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch (e) {
      return {};
    }
  }

  // Upstage Studio Agent include: ["all"] steps 또는 output 복합 응답 대응
  var stepsList = (parsed && Array.isArray(parsed.output)) ? parsed.output : ((parsed && Array.isArray(parsed.steps)) ? parsed.steps : null);
  if (stepsList && stepsList.length > 0) {
    var extractDocs = [];
    var instructStructured = null;
    var instructHumanSummary = null;

    for (var si = 0; si < stepsList.length; si++) {
      var st = stepsList[si];
      if (!st) continue;
      var mName = String(st.model || st.step_name || st.step_type || "").toLowerCase();

      // (a) instruct step 탐색
      if (mName.indexOf("instruct") >= 0 || (st.result && st.result.structured_result)) {
        if (st.result && st.result.structured_result) {
          instructStructured = st.result.structured_result;
          instructHumanSummary = st.result.human_summary;
        } else if (Array.isArray(st.content)) {
          for (var ci = 0; ci < st.content.length; ci++) {
            var cItem = st.content[ci];
            if (cItem && cItem.type === "output_text" && typeof cItem.text === "string") {
              try {
                var pInst = JSON.parse(cItem.text);
                if (pInst && pInst.structured_result) {
                  instructStructured = pInst.structured_result;
                  instructHumanSummary = pInst.human_summary;
                }
              } catch (e) {
                try {
                  var pInst2 = JSON.parse(cItem.text + "}");
                  if (pInst2 && pInst2.structured_result) {
                    instructStructured = pInst2.structured_result;
                    instructHumanSummary = pInst2.human_summary;
                  }
                } catch (e2) {}
              }
            }
          }
        }
      }

      // (b) extract step 탐색
      if (st.result && Array.isArray(st.result.documents)) {
        extractDocs = extractDocs.concat(st.result.documents);
      } else if (Array.isArray(st.content)) {
        for (var cj = 0; cj < st.content.length; cj++) {
          var cObj = st.content[cj];
          if (!cObj) continue;
          if (cObj.type === "output_text" && (cObj.additional_values || mName.indexOf("extract") >= 0)) {
            var pData = {};
            if (typeof cObj.text === "string") {
              try { pData = JSON.parse(cObj.text); } catch (e) {}
            }
            var pAv = {};
            if (cObj.additional_values) {
              if (typeof cObj.additional_values === "string") {
                try { pAv = JSON.parse(cObj.additional_values); } catch (e) {}
              } else if (typeof cObj.additional_values === "object") {
                pAv = cObj.additional_values;
              }
            }
            var sType = mName.replace(/^information extract\s*-\s*/i, "").replace(/_schema$/i, "").trim();
            var dType = pData.document_type || pAv.document_type || sType;
            if (dType || sType) {
              extractDocs.push({
                document_type: dType || sType,
                schema_name: sType,
                data: pData,
                additional_values: pAv
              });
            }
          }
        }
      }
    }

    if (instructStructured) {
      if (instructStructured.date_checks) {
        var misplacedKeys = ["comparison_matrix", "document_checklists", "discrepancy_candidates", "check_item_evidence", "document_extract_evidence", "checklist_results"];
        for (var mi = 0; mi < misplacedKeys.length; mi++) {
          var mKey = misplacedKeys[mi];
          if (instructStructured.date_checks[mKey] !== undefined && instructStructured[mKey] === undefined) {
            instructStructured[mKey] = instructStructured.date_checks[mKey];
            delete instructStructured.date_checks[mKey];
          }
        }
      }
      if (extractDocs.length > 0) {
        enrichEvidenceWithOcrCoordinates({ documents: extractDocs }, instructStructured);
      }
      if (instructHumanSummary && !instructStructured.human_summary) {
        instructStructured.human_summary = instructHumanSummary;
      }
      return enrichComparisonMatrix(instructStructured);
    }
  }

  var resolved = null;
  if (parsed && parsed.instruct_result) {
    resolved = parsed.instruct_result.structured_result || parsed.instruct_result;
  } else if (parsed && parsed.structured_result) {
    resolved = parsed.structured_result;
  } else if (parsed && parsed.content) {
    if (typeof parsed.content === "string") {
      try {
        var inner = JSON.parse(parsed.content);
        if (inner.instruct_result) {
          resolved = inner.instruct_result.structured_result || inner.instruct_result;
        } else {
          resolved = inner.structured_result || inner;
        }
      } catch (e) {}
    } else if (typeof parsed.content === "object") {
      if (parsed.content.instruct_result) {
        resolved = parsed.content.instruct_result.structured_result || parsed.content.instruct_result;
      } else {
        resolved = parsed.content.structured_result || parsed.content;
      }
    }
  }

  if (!resolved) resolved = parsed || {};
  return enrichComparisonMatrix(resolved);
}

function enrichComparisonMatrix(structured) {
  if (!structured) return structured;
  var rows = structured.comparison_matrix;
  if (!Array.isArray(rows) || rows.length === 0) return structured;

  var evidenceList = structured.check_item_evidence || structured.check_results || currentCheckItemEvidence || currentCheckResults || [];

  function isPresenceStatusWord(val) {
    if (!val) return false;
    var s = String(val).trim().toLowerCase();
    return s === "present" || s === "missing" || s === "not_available" || s === "n/a" ||
           s === "구비됨" || s === "미제출" || s === "미해당" || s === "있음" || s === "없음";
  }

  rows.forEach(function (row) {
    if (!row) return;
    row.result = row.result || row.verdict || row.status || row.judgment || "";
    if (!row.verdict && row.result) {
      row.verdict = row.result;
    }

    var itemKey = row.check_item || row.check_item_ko || row.label;

    // v14 HS Code 일치성 점검 항목 지원
    if (itemKey === "hs_code" || itemKey === "hs_code_consistency") {
      if (!row.check_item_ko) row.check_item_ko = "HS 코드 일치성";
      if (!row.category) row.category = "물품 및 조건";
    }

    var isFilePresence = itemKey === "file_presence" ||
                         itemKey === "required_documents_presence" ||
                         (row.check_item_ko && (row.check_item_ko.indexOf("서류 구비") >= 0 || row.check_item_ko.indexOf("서류구비") >= 0));

    // 🌟 사용자 코멘트 2 반영:
    // 서류 구비 현황(file_presence)은 문서 번호(Key No)나 일자가 아닌 "구비 여부(present / missing / not_available)"만 표시
    if (isFilePresence) {
      var dp = structured.document_presence || {};
      var docMapPresence = {
        commercial_invoice: dp.commercial_invoice !== false ? "present" : "missing",
        bill_of_lading: dp.bill_of_lading !== false ? "present" : "missing",
        packing_list: dp.packing_list !== false ? "present" : "missing",
        marine_cargo_insurance: dp.marine_cargo_insurance !== false ? "present" : "missing",
        certificate_of_origin: dp.certificate_of_origin ? "present" : "missing",
        lc: dp.lc ? "present" : "not_available"
      };

      Object.keys(docMapPresence).forEach(function (stdKey) {
        var cur = row[stdKey];
        if (!cur || !isPresenceStatusWord(cur)) {
          row[stdKey] = docMapPresence[stdKey];
        }
      });

      // 기타(도착통지서 등) 문서 구비 여부
      if (!row.other_document || !isPresenceStatusWord(row.other_document)) {
        if (currentActiveSampleIndex === 1 || currentActiveSampleIndex === 2 || (structured.date_checks && structured.date_checks.arrival_notice_date)) {
          row.other_document = "present";
        }
      }

      // file_presence 항목은 evidence의 Key No(송장번호, B/L번호 등)로 덮어쓰지 않고 즉시 반환
      return;
    }

    var ev = evidenceList.find(function (e) {
      if (!e) return false;
      return e.check_item === itemKey || e.label === itemKey || e.check_item_ko === itemKey;
    });

    if (ev && ev.documents) {
      var docMap = {
        lc: ["lc"],
        commercial_invoice: ["commercial_invoice", "invoice"],
        bill_of_lading: ["bill_of_lading", "bl"],
        packing_list: ["packing_list"],
        marine_cargo_insurance: ["marine_cargo_insurance", "insurance"],
        certificate_of_origin: ["certificate_of_origin", "coo"],
        other_document: ["other_document", "other", "arrival_notice"]
      };

      Object.keys(docMap).forEach(function (stdKey) {
        var aliases = docMap[stdKey];
        var currentVal = null;
        for (var i = 0; i < aliases.length; i++) {
          if (row[aliases[i]] !== undefined && row[aliases[i]] !== null && row[aliases[i]] !== "") {
            currentVal = row[aliases[i]];
            break;
          }
        }
        if (!currentVal) {
          for (var j = 0; j < aliases.length; j++) {
            var alias = aliases[j];
            if (ev.documents[alias] && hasMeaningfulValue(ev.documents[alias].value)) {
              row[stdKey] = ev.documents[alias].value;
              break;
            }
          }
        }
      });
    }
  });

  // v17 HS Code 일치성 행 자동 보완 및 B/L, other_document 반영
  var hasHsRow = rows.some(function (r) {
    if (!r) return false;
    var k = r.check_item || r.check_item_ko || r.label;
    return k === "hs_code" || k === "hs_code_consistency";
  });

  var hsInfo = collectAllHsCodes(structured, currentRawPayload);
  if (!hasHsRow && Object.keys(hsInfo.docMap).length > 0) {
    var newHsRow = {
      category: "물품 및 조건",
      check_item: "hs_code_consistency",
      check_item_ko: "HS 코드 일치성",
      result: hsInfo.status === "mismatch" ? "mismatch" : (hsInfo.status === "match" ? "match" : "unclear"),
      commercial_invoice: (hsInfo.docMap.commercial_invoice && hsInfo.docMap.commercial_invoice.value) || "",
      certificate_of_origin: (hsInfo.docMap.certificate_of_origin && hsInfo.docMap.certificate_of_origin.value) || "",
      bill_of_lading: (hsInfo.docMap.bill_of_lading && hsInfo.docMap.bill_of_lading.value) || "",
      packing_list: (hsInfo.docMap.packing_list && hsInfo.docMap.packing_list.value) || "",
      marine_cargo_insurance: (hsInfo.docMap.marine_cargo_insurance && hsInfo.docMap.marine_cargo_insurance.value) || "",
      other_document: (hsInfo.docMap.other_document && hsInfo.docMap.other_document.value) || "",
      lc: (hsInfo.docMap.lc && hsInfo.docMap.lc.value) || "",
      note: hsInfo.status === "mismatch" ? ("문서 간 HS Code 상이 (" + hsInfo.values.join(" vs ") + ")") : ""
    };
    var goodsIdx = -1;
    for (var gi = 0; gi < rows.length; gi++) {
      var rk = rows[gi] && (rows[gi].check_item || rows[gi].check_item_ko || rows[gi].label);
      if (rk === "goods_description" || (rows[gi].check_item_ko && rows[gi].check_item_ko.indexOf("물품 명세") >= 0)) {
        goodsIdx = gi;
        break;
      }
    }
    if (goodsIdx >= 0) {
      rows.splice(goodsIdx + 1, 0, newHsRow);
    } else {
      rows.push(newHsRow);
    }
  } else if (hasHsRow) {
    var existHsRow = rows.find(function (r) {
      if (!r) return false;
      var k = r.check_item || r.check_item_ko || r.label;
      return k === "hs_code" || k === "hs_code_consistency";
    });
    if (existHsRow) {
      if (!existHsRow.bill_of_lading && hsInfo.docMap.bill_of_lading) {
        existHsRow.bill_of_lading = hsInfo.docMap.bill_of_lading.value;
      }
      if (!existHsRow.other_document && hsInfo.docMap.other_document) {
        existHsRow.other_document = hsInfo.docMap.other_document.value;
      }
      if (hsInfo.status === "mismatch" && (!existHsRow.result || existHsRow.result === "match")) {
        existHsRow.result = "mismatch";
      }
    }
  }

  return structured;
}

function renderUsage(finalJob) {
  if (!els.usageCard) return;

  var usage = finalJob.usage;
  var stepName = (finalJob.output && finalJob.output[0] && finalJob.output[0].model) || finalJob.model || "Agent Job";

  if (usage || stepName) {
    els.usageCard.style.display = "block";
    els.usageStepName.textContent = stepName;
    els.usageInputTokens.textContent = (usage && usage.input_tokens != null) ? usage.input_tokens.toLocaleString() : "-";
    els.usageOutputTokens.textContent = (usage && usage.output_tokens != null) ? usage.output_tokens.toLocaleString() : "-";
    els.usageTotalTokens.textContent = (usage && usage.total_tokens != null) ? usage.total_tokens.toLocaleString() : "-";
  } else {
    els.usageCard.style.display = "none";
  }
}

function simplifyKeyName(rawKey) {
  if (!rawKey) return "";
  var k = String(rawKey).toLowerCase().trim();
  if (k === "lc_number" || k === "lc_no") return "LC_NO";
  if (k === "invoice_number" || k === "invoice_no" || k === "commercial_invoice_number") return "INV_NO";
  if (k === "bl_number" || k === "bl_no" || k === "bill_of_lading_number") return "BL_NO";
  if (k === "policy_certificate_number" || k === "insurance_policy_number" || k === "insurance_number") return "INS_NO";
  if (k === "certificate_number" || k === "coo_number" || k === "coo_no") return "COO_NO";
  if (k === "hs_code" || k === "hscode") return "HS_CODE";

  return k.replace(/_number$/, "_no").replace(/_no$/, "_NO").toUpperCase();
}

/**
 * v17 HS Code 수집 엔진
 * 1) 대표 HS Code (document_keys.hs_code 또는 송장/원산지 우선)
 * 2) 문서별 HS Code 맵 (상업송장, 원산지증명서, B/L, 패킹리스트 등)
 * 3) 문서 간 불일치(mismatch) / 일치(match) / 단일기재 상태 산출
 */
function collectAllHsCodes(structured, rawSource, docKeysInput) {
  var docMap = {};
  var docKeys = docKeysInput || (structured && structured.document_keys) || {};
  var repCode = cleanText(docKeys.hs_code || docKeys.hscode || "");

  // A. document_extract_evidence
  var rawSt = structured || (rawSource && (rawSource.structured_result || (rawSource.instruct_result && rawSource.instruct_result.structured_result)));
  var docEv = (rawSt && rawSt.document_extract_evidence) || {};
  Object.keys(docEv).forEach(function (dKey) {
    var dObj = docEv[dKey];
    if (dObj && dObj.hs_code) {
      var val = typeof dObj.hs_code === "object" ? dObj.hs_code.value : dObj.hs_code;
      if (hasMeaningfulValue(val)) {
        var std = normalizeToStandardDocKey(dKey) || dKey;
        docMap[std] = {
          value: cleanText(val),
          source: normalizeSource(dObj.hs_code.source || dObj.hs_code.evidence || dObj.hs_code)
        };
      }
    }
  });

  // B. intermediate extraction steps in output
  var stepsList = (rawSource && Array.isArray(rawSource.output)) ? rawSource.output : ((rawSource && Array.isArray(rawSource.steps)) ? rawSource.steps : null);
  if (stepsList) {
    stepsList.forEach(function (st) {
      if (st && st.model && st.model.indexOf("Information Extract") >= 0 && Array.isArray(st.content)) {
        st.content.forEach(function (c) {
          if (c && c.text && c.type === "output_text") {
            try {
              var p = JSON.parse(c.text);
              if (hasMeaningfulValue(p.hs_code)) {
                var sName = st.model.replace(/^information extract\s*-\s*/i, "").replace(/_schema$/i, "").trim();
                var stdKey = normalizeToStandardDocKey(sName) || sName;
                if (!docMap[stdKey] || !docMap[stdKey].value) {
                  var pAv = null;
                  if (c.additional_values) {
                    pAv = typeof c.additional_values === "string" ? JSON.parse(c.additional_values) : c.additional_values;
                  }
                  var avHs = pAv && pAv.hs_code;
                  var src = avHs ? (typeof convertOcrLocationToBox === "function" ? convertOcrLocationToBox(avHs) : null) : null;
                  docMap[stdKey] = {
                    value: cleanText(p.hs_code),
                    source: src
                  };
                }
              }
            } catch (e) {}
          }
        });
      }
    });
  }

  // C. comparison_matrix
  var matrix = (structured && structured.comparison_matrix) || (rawSt && rawSt.comparison_matrix) || [];
  var hsRow = matrix.find(function (r) {
    if (!r) return false;
    var k = r.check_item || r.check_item_ko || r.label;
    return k === "hs_code" || k === "hs_code_consistency";
  });
  if (hsRow) {
    ["commercial_invoice", "certificate_of_origin", "bill_of_lading", "packing_list", "marine_cargo_insurance", "other_document"].forEach(function (dk) {
      if (hasMeaningfulValue(hsRow[dk]) && !docMap[dk]) {
        docMap[dk] = { value: cleanText(hsRow[dk]), source: null };
      }
    });
  }

  // D. Fallback for repCode if not specified
  if (!repCode) {
    if (docMap.commercial_invoice && docMap.commercial_invoice.value) {
      repCode = docMap.commercial_invoice.value;
    } else if (docMap.certificate_of_origin && docMap.certificate_of_origin.value) {
      repCode = docMap.certificate_of_origin.value;
    } else {
      var keys = Object.keys(docMap);
      if (keys.length > 0) repCode = docMap[keys[0]].value;
    }
  }

  // E. Unique values and consistency status
  var values = [];
  Object.keys(docMap).forEach(function (dk) {
    var v = docMap[dk].value;
    if (v && values.indexOf(v) === -1) {
      values.push(v);
    }
  });

  var status = "unclear";
  if (values.length > 1) {
    status = "mismatch";
  } else if (values.length === 1) {
    status = "match";
  } else if (repCode) {
    status = "single";
  }

  return {
    repCode: repCode,
    docMap: docMap,
    values: values,
    status: status
  };
}

/**
 * 주요 문서 번호 (Document Keys) 렌더링
 * LC, INV, BL, INS, COO 및 HS_CODE를 동일한 단일 라인 칩 형태로 통합 표시
 */
function renderDocumentKeys(documentKeys, structured, rawSource) {
  var html = "";
  var key;

  if (!documentKeys || typeof documentKeys !== "object") {
    documentKeys = {};
  }

  // Clone document keys map
  var keysMap = Object.assign({}, documentKeys);

  // Collect HS code information & ensure hs_code exists in keysMap
  var hsInfo = collectAllHsCodes(structured, rawSource, keysMap);
  var repCode = hsInfo.repCode || cleanText(keysMap.hs_code || keysMap.hscode || "");
  if (repCode) {
    keysMap.hs_code = repCode;
  }

  // Preferred display order for major document numbers
  var preferredOrder = [
    "lc_number", "lc_no",
    "invoice_number", "invoice_no", "commercial_invoice_number",
    "bl_number", "bl_no", "bill_of_lading_number",
    "packing_list_number", "packing_list_no",
    "policy_certificate_number", "insurance_policy_number", "insurance_number",
    "certificate_number", "coo_number", "coo_no",
    "hs_code", "hscode"
  ];

  var renderedKeys = {};

  function renderKeyPill(k, val) {
    if (renderedKeys[k]) return;
    renderedKeys[k] = true;
    var dKey = simplifyKeyName(k);
    var cVal = cleanText(val);
    var isHs = (k === "hs_code" || k === "hscode");
    var tooltip = isHs
      ? "클릭하여 원본 서류의 HS Code 위치로 이동 및 하이라이트"
      : "클릭하여 원본 서류의 해당 번호 위치로 이동 및 하이라이트";
    html += '<div class="kv-item clickable-key" data-key="' + escapeHtml(isHs ? "hs_code" : k) + '" title="' + escapeHtml(tooltip) + '">';
    html += '<span class="kv-key">' + escapeHtml(dKey) + ' :</span>';
    html += '<span class="kv-value">' + escapeHtml(cVal || "-") + '</span>';
    html += '</div>';
  }

  // 1. Render in preferred order
  preferredOrder.forEach(function (k) {
    if (Object.prototype.hasOwnProperty.call(keysMap, k)) {
      renderKeyPill(k, keysMap[k]);
    }
  });

  // 2. Render any remaining keys
  for (key in keysMap) {
    if (Object.prototype.hasOwnProperty.call(keysMap, key)) {
      if (!renderedKeys[key]) {
        renderKeyPill(key, keysMap[key]);
      }
    }
  }

  els.documentKeys.innerHTML = html || '<div class="empty-cell">주요 문서 번호 정보 없음</div>';

  var items = els.documentKeys.querySelectorAll(".clickable-key");
  items.forEach(function (el) {
    el.addEventListener("click", function () {
      var k = this.getAttribute("data-key");
      var d = this.getAttribute("data-doc");
      if (k === "hs_code" || k === "hscode") {
        openDocViewerWithCheckItem("hs_code", d);
      } else {
        openDocViewerWithField(k, d);
      }
    });
  });
}

function renderDateTimeline(dateChecks) {
  if (!els.dateTimeline) return;

  var items = [
    { key: "insurance_policy_issue_date", label: "Insurance Issue" },
    { key: "invoice_date", label: "Invoice" },
    { key: "packing_list_date", label: "Packing List" },
    { key: "bl_shipment_date", label: "B/L Shipment" },
    { key: "bl_on_board_date", label: "B/L On Board" },
    { key: "latest_shipment_date", label: "Latest Shipment" },
    { key: "lc_issue_date", label: "LC Issue" },
    { key: "certificate_issue_date", label: "COO Issue" }
  ];

  var html = "";
  var i;
  var item;
  var value;
  var statusClass = "badge-neutral";
  var noteThemeClass = "timeline-note-neutral";
  var cleanedNotes = "";
  var headerBadgeEl = document.getElementById("timelineHeaderBadge");

  if (!dateChecks || typeof dateChecks !== "object") {
    els.dateTimeline.innerHTML = "결과 없음";
    if (headerBadgeEl) headerBadgeEl.innerHTML = "";
    return;
  }

  var st = String(dateChecks.date_sequence_status || "").toLowerCase();
  if (
    st.indexOf("일치") >= 0 ||
    st.indexOf("구비") >= 0 ||
    st === "match" ||
    st === "ok" ||
    st === "pass"
  ) {
    statusClass = "badge-ok";
    noteThemeClass = "timeline-note-ok";
  } else if (
    st.indexOf("불일치") >= 0 ||
    st.indexOf("보류") >= 0 ||
    st === "mismatch" ||
    st === "fail"
  ) {
    statusClass = "badge-crit";
    noteThemeClass = "timeline-note-crit";
  } else if (
    st.indexOf("검토") >= 0 ||
    st.indexOf("주의") >= 0 ||
    st.indexOf("확인") >= 0 ||
    st === "missing" ||
    st === "unclear" ||
    st === "warn"
  ) {
    statusClass = "badge-warn";
    noteThemeClass = "timeline-note-warn";
  }

  if (headerBadgeEl) {
    headerBadgeEl.innerHTML =
      '<span class="badge ' +
      statusClass +
      '"><i class="bi bi-shield-check"></i> 종합 판정: ' +
      escapeHtml(koreanStatus(dateChecks.date_sequence_status)) +
      "</span>";
  }

  cleanedNotes = cleanText(dateChecks.date_sequence_notes || "날짜 흐름 설명 없음");

  if (cleanedNotes) {
    html += '<div class="timeline-note-box ' + noteThemeClass + '">';
    html += '<div>' + escapeHtml(cleanedNotes) + '</div>';
    html += '</div>';
  }

  html += '<div class="doc-comparison-grid">';

  for (i = 0; i < items.length; i += 1) {
    item = items[i];
    value = cleanText(dateChecks[item.key] || "");
    if (!value) {
      continue;
    }

    html += '<div class="doc-box">';
    html += '<div class="doc-box-label">' + escapeHtml(item.label) + '</div>';
    html += '<div class="doc-box-val">' + escapeHtml(value) + '</div>';
    html += '</div>';
  }

  html += '</div>';

  els.dateTimeline.innerHTML = html || "날짜 정보 없음";
}

/**
 * Code.md v5 Contract:
 * comparison_matrix의 셀 표시 및 check_item_evidence 기반 하이라이트 여부 판별 헬퍼
 * - 값은 있으나 위치가 없는 경우(source.page <= 0 등): 값 표시, 클릭 비활성화, "원문 위치 정보 없음"
 * - 문서 슬롯 자체가 없는 경우: "해당 문서 근거 없음"
 * - check_item_evidence가 있는 최신 응답: canHighlight 여부에 따라 셀 스타일 및 툴팁 분기
 * - 레거시 샘플(check_item_evidence 없음): 기존 정적 레지스트리 기반 클릭 지원
 */
function hasMeaningfulValue(val) {
  if (val === null || val === undefined) return false;
  var s = String(val).trim();
  return s !== "" && s !== "-" && s !== "미기재" && s !== "null" && s !== "undefined";
}

function isNegationOrStatusValue(val) {
  if (!val) return false;
  var s = String(val).trim().toLowerCase();
  return s === "미해당" || s === "n/a" || s === "not_available" || s === "미제출" || s === "missing";
}

function buildComparisonCellInfo(itemKey, docKey, docTitle, rawVal) {
  var evidenceDoc = getEvidence(itemKey, docKey);
  var hasEvidenceData = (currentCheckResults && currentCheckResults.length > 0) || (currentCheckItemEvidence && currentCheckItemEvidence.length > 0);

  var rawHas = hasMeaningfulValue(rawVal);
  var evHas = evidenceDoc && hasMeaningfulValue(evidenceDoc.value);
  var effectiveVal = rawHas ? rawVal : (evHas ? evidenceDoc.value : null);

  // 1. If neither matrix rawVal nor evidence has any meaningful value
  if (!hasMeaningfulValue(effectiveVal)) {
    return {
      canClick: false,
      cellClass: "non-clickable-cell no-evidence empty-cell",
      tooltip: docTitle + ": 해당 항목 기재 없음",
      htmlVal: formatTableCellHtml("-")
    };
  }

  // 2. Explicit negation or presence status (미해당, 미제출)
  if (isNegationOrStatusValue(effectiveVal)) {
    return {
      canClick: false,
      cellClass: "non-clickable-cell no-evidence",
      tooltip: docTitle + ": " + formatDocValue(effectiveVal),
      htmlVal: formatTableCellHtml(effectiveVal)
    };
  }

  // 3. Highlightable evidence with valid BBox
  var isCorrupted = String(effectiveVal).indexOf("?") >= 0;
  if (hasEvidenceData) {
    if (evidenceDoc && canHighlight(evidenceDoc, docKey, itemKey)) {
      var targetInfo = getEvidenceTarget(currentActiveSampleIndex || 1, docKey, evidenceDoc, itemKey);
      var pNum = (targetInfo && targetInfo.page) ? targetInfo.page : 1;
      var tip = isCorrupted
        ? "클릭 시 " + docTitle + " 위치 확인 (p." + pNum + ") [판독 주의]"
        : "클릭 시 " + docTitle + " 위치 확인 (p." + pNum + ")";
      return {
        canClick: true,
        cellClass: "clickable-cell has-evidence" + (isCorrupted ? " cell-ocr-warn" : ""),
        tooltip: tip,
        htmlVal: formatTableCellHtml(effectiveVal)
      };
    } else {
      return {
        canClick: false,
        cellClass: "non-clickable-cell no-location" + (isCorrupted ? " cell-ocr-warn" : ""),
        tooltip: "원문 위치 정보 없음 (값: " + effectiveVal + ")",
        htmlVal: formatTableCellHtml(effectiveVal)
      };
    }
  }

  return {
    canClick: true,
    cellClass: "clickable-cell",
    tooltip: "클릭 시 " + docTitle + " 위치 확인",
    htmlVal: formatTableCellHtml(effectiveVal)
  };
}

function renderComparisonTable(rows) {
  var html = "";
  var cardsHtml = "";

  if (!rows || !rows.length) {
    if (els.comparisonTableBody) {
      els.comparisonTableBody.innerHTML = '<div class="empty-cell">비교표 데이터가 없습니다.</div>';
    }
    if (els.comparisonCardsContainer) {
      els.comparisonCardsContainer.innerHTML = '<div class="empty-cell">비교표 데이터가 없습니다.</div>';
    }
    return;
  }

  /* Group rows by category */
  var categoryMap = {};
  var categoryOrder = [];

  var hasOtherDoc = rows.some(function (r) {
    return r && r.other_document !== undefined && r.other_document !== null && r.other_document !== "" && r.other_document !== "-";
  }) || (currentActiveSampleIndex === 1 || currentActiveSampleIndex === 2);

  var catIcons = {
    "서류 구비 현황": '<i class="bi bi-folder2-open"></i>',
    "당사자 정보": '<i class="bi bi-people-fill"></i>',
    "물품 및 조건": '<i class="bi bi-box-seam-fill"></i>',
    "식별번호": '<i class="bi bi-hash"></i>',
    "날짜 및 선적": '<i class="bi bi-calendar-range-fill"></i>'
  };

  rows.forEach(function (row) {
    var cat = row.category || "기타 검토 항목";
    if (!categoryMap[cat]) {
      categoryMap[cat] = [];
      categoryOrder.push(cat);
    }
    categoryMap[cat].push(row);
  });

  categoryOrder.forEach(function (catName) {
    var catRows = categoryMap[catName];
    var icon = catIcons[catName] || "📌";

    var matchCount = 0;
    var warnCount = 0;
    var critCount = 0;

    catRows.forEach(function (r) {
      var res = String(r.result || r.verdict || r.status || r.judgment || "").toLowerCase();
      if (
        res.indexOf("불일치") >= 0 ||
        res === "mismatch" ||
        res === "missing" ||
        res === "fail"
      ) {
        critCount += 1;
      } else if (
        res.indexOf("검토") >= 0 ||
        res.indexOf("주의") >= 0 ||
        res === "review_required" ||
        res === "warning" ||
        res === "warn" ||
        res === "unclear"
      ) {
        warnCount += 1;
      } else if (
        res.indexOf("일치") >= 0 ||
        res.indexOf("구비") >= 0 ||
        res === "match" ||
        res === "ok" ||
        res === "pass" ||
        res === "present"
      ) {
        matchCount += 1;
      }
    });

    var summaryBadgeHtml = "";
    if (critCount > 0) {
      summaryBadgeHtml += '<span class="badge badge-crit">불일치 ' + critCount + '</span> ';
    }
    if (warnCount > 0) {
      summaryBadgeHtml += '<span class="badge badge-warn">검토필요 ' + warnCount + '</span> ';
    }
    if (matchCount > 0) {
      summaryBadgeHtml += '<span class="badge badge-ok">일치 ' + matchCount + '</span>';
    }

    /* Category Table Block (Table View - Nested Group Container) */
    html += '<div class="category-table-block">';
    html += '<div class="category-block-header">';
    html += '<div class="group-header-title">';
    html += '<span class="group-icon">' + icon + '</span> ';
    html += '<strong>' + escapeHtml(catName) + '</strong> ';
    html += '<span class="group-count">(' + catRows.length + '개 항목)</span>';
    html += '</div>';
    html += '<div class="group-header-badges">' + summaryBadgeHtml + '</div>';
    html += '</div>';

    var colWidth = hasOtherDoc ? "10.28%" : "11.83%";
    var itemWidth = hasOtherDoc ? "20%" : "21%";

    html += '<table class="data-table">';
    html += '<thead>';
    html += '<tr class="group-subheader-row">';
    html += '<th class="col-item" style="width: ' + itemWidth + ';"><i class="bi bi-card-checklist"></i> 검토 항목</th>';
    html += '<th class="col-result" style="width: 8%;"><i class="bi bi-shield-check"></i> 결과</th>';
    html += '<th class="col-doc col-lc" style="width: ' + colWidth + ';"><i class="bi bi-file-earmark-text"></i> L/C</th>';
    html += '<th class="col-doc col-inv" style="width: ' + colWidth + ';"><i class="bi bi-receipt"></i> 송장</th>';
    html += '<th class="col-doc col-bl" style="width: ' + colWidth + ';"><i class="bi bi-water"></i> B/L</th>';
    html += '<th class="col-doc col-pk" style="width: ' + colWidth + ';"><i class="bi bi-box-seam"></i> 포장</th>';
    html += '<th class="col-doc col-ins" style="width: ' + colWidth + ';"><i class="bi bi-shield-check"></i> 보험</th>';
    html += '<th class="col-doc col-coo" style="width: ' + colWidth + ';"><i class="bi bi-bank"></i> COO</th>';
    if (hasOtherDoc) {
      html += '<th class="col-doc col-other" style="width: ' + colWidth + ';"><i class="bi bi-bell-fill"></i> 기타(통지)</th>';
    }
    html += '</tr>';
    html += '</thead>';
    html += '<tbody>';

    /* Category Cards Section (Card View - Grid Layout) */
    cardsHtml += '<div class="card-category-section">';
    cardsHtml += '<div class="mobile-group-header">';
    cardsHtml += '<div class="mobile-group-title">';
    cardsHtml += '<span class="group-icon">' + icon + '</span> ';
    cardsHtml += '<strong>' + escapeHtml(catName) + '</strong> ';
    cardsHtml += '<span class="group-count">(' + catRows.length + '개 항목)</span>';
    cardsHtml += '</div>';
    cardsHtml += '<div class="group-header-badges">' + summaryBadgeHtml + '</div>';
    cardsHtml += '</div>';
    cardsHtml += '<div class="card-category-grid">';

    /* Member Rows & Mobile Cards */
    catRows.forEach(function (row) {
      var rowResult = row.result || row.verdict || row.status || row.judgment || "";
      var rowClass = rowHighlightClass(rowResult);
      var itemTitle = row.check_item_ko || row.check_item || "-";

      var docCols = [
        { key: "lc", label: "L/C", title: "L/C", val: row.lc },
        { key: "invoice", label: "송장", title: "상업송장", val: row.commercial_invoice || row.invoice },
        { key: "bl", label: "B/L", title: "선하증권(B/L)", val: row.bill_of_lading || row.bl },
        { key: "packing_list", label: "포장", title: "포장명세서", val: row.packing_list },
        { key: "insurance", label: "보험", title: "해상보험증권", val: row.marine_cargo_insurance || row.insurance },
        { key: "coo", label: "COO", title: "원산지증명서", val: row.certificate_of_origin || row.coo }
      ];
      if (hasOtherDoc) {
        docCols.push({ key: "other_document", label: "기타(통지)", title: "기타서류(도착통지서 등)", val: row.other_document });
      }

      // Table Row
      html += '<tr class="' + rowClass + '">';
      html += '<td><strong class="item-title-cell">' + escapeHtml(cleanText(itemTitle)) + '</strong></td>';
      html += '<td class="' + resultCellClass(rowResult) + '">' + escapeHtml(koreanStatus(rowResult)) + '</td>';

      docCols.forEach(function (d) {
        var cInfo = buildComparisonCellInfo(row.check_item, d.key, d.title, d.val);
        html += '<td class="' + cInfo.cellClass + '" data-check-item="' + escapeHtml(row.check_item) + '" data-doc="' + d.key + '" title="' + escapeHtml(cInfo.tooltip) + '">' + cInfo.htmlVal + '</td>';
      });

      html += '</tr>';

      // Mobile Card Item
      cardsHtml += '<div class="mobile-matrix-card ' + rowClass + '">';
      cardsHtml += '<div class="mobile-card-top">';
      cardsHtml += '<span class="mobile-card-title">' + escapeHtml(cleanText(itemTitle)) + '</span>';
      cardsHtml += '<span class="' + badgeClass(rowResult) + '">' + escapeHtml(koreanStatus(rowResult)) + '</span>';
      cardsHtml += '</div>';
      cardsHtml += '<div class="mobile-card-doc-grid">';

      docCols.forEach(function (d) {
        var cInfo = buildComparisonCellInfo(row.check_item, d.key, d.label, d.val);
        cardsHtml += '<div class="mobile-doc-item ' + cInfo.cellClass + '" data-check-item="' + escapeHtml(row.check_item) + '" data-doc="' + d.key + '" title="' + escapeHtml(cInfo.tooltip) + '">';
        cardsHtml += '<span class="mobile-doc-tag">' + escapeHtml(d.label) + '</span>';
        cardsHtml += '<div class="mobile-doc-val-wrap">' + cInfo.htmlVal + '</div>';
        cardsHtml += '</div>';
      });

      cardsHtml += '</div>';
      cardsHtml += '</div>';
    });

    html += '</tbody>';
    html += '</table>';
    html += '</div>'; // close category-table-block

    cardsHtml += '</div>'; // close card-category-grid
    cardsHtml += '</div>'; // close card-category-section
  });

  if (els.comparisonTableBody) {
    els.comparisonTableBody.innerHTML = html;
  }
  if (els.comparisonCardsContainer) {
    els.comparisonCardsContainer.innerHTML = cardsHtml;
  }

  // Bind click listeners for table & card cells
  var allDocCells = document.querySelectorAll(".data-table td[data-check-item], .mobile-matrix-card .mobile-doc-item[data-check-item]");
  allDocCells.forEach(function (c) {
    c.addEventListener("click", function () {
      if (this.classList.contains("non-clickable-cell") || this.classList.contains("empty-cell") || this.classList.contains("no-evidence") || this.classList.contains("no-location")) {
        return;
      }
      var itemKey = this.getAttribute("data-check-item");
      var doc = this.getAttribute("data-doc");
      openDocViewerWithCheckItem(itemKey, doc);
    });
  });
}

/* ==========================================================================
   서류별 개별 상세 체크리스트 정규화 엔진 (6대 무역서류 탭 고정 및 원문 증거 BBox 팝업 연동)
   ========================================================================== */

var STANDARD_TRADE_DOC_DEFS = [
  {
    key: "lc",
    label: "L/C 신용장",
    aliases: ["lc", "letterofcredit", "신용장", "loc", "lc_schema", "letter_of_credit"]
  },
  {
    key: "commercial_invoice",
    label: "상업송장 (INV)",
    aliases: ["commercial_invoice", "invoice", "commercialinvoice", "inv", "ci", "상업송장", "송장", "commercial_invoice_schema"]
  },
  {
    key: "bill_of_lading",
    label: "선하증권 (B/L)",
    aliases: ["bill_of_lading", "bl", "billoflading", "bol", "선하증권", "선하증권bl", "선하증권b/l", "bill_of_lading_schema"]
  },
  {
    key: "packing_list",
    label: "포장명세서 (PK)",
    aliases: ["packing_list", "pl", "packing", "packinglist", "패킹리스트", "포장명세서", "packing_list_schema"]
  },
  {
    key: "marine_cargo_insurance",
    label: "해상보험 (INS)",
    aliases: ["marine_cargo_insurance", "insurance", "ins", "marinecargoinsurance", "policy", "해상적하보험증권", "보험증권", "해상보험", "marine_cargo_insurance_schema"]
  },
  {
    key: "certificate_of_origin",
    label: "원산지증명 (COO)",
    aliases: ["certificate_of_origin", "coo", "co", "certificateoforigin", "원산지증명서", "원산지증명", "certificate_of_origin_schema"]
  },
  {
    key: "other_document",
    label: "도착통지서 등 (NOTICE)",
    aliases: ["other_document", "other", "otherdocument", "기타문서", "기타", "도착통지서 등 (notice)", "notice"]
  }
];

function normalizeToStandardDocKey(rawKey) {
  if (!rawKey) return null;
  var s = String(rawKey).toLowerCase().trim();
  // 파이프라인 단계나 임의의 중간 객체는 절대 서류 탭으로 처리하지 않음
  if (s.indexOf("step") === 0 || s.indexOf("object") >= 0 || s.indexOf("instruct") >= 0 || s.indexOf("merge") >= 0) {
    return null;
  }
  var clean = s.replace(/[\s\-_]+/g, "");
  for (var i = 0; i < STANDARD_TRADE_DOC_DEFS.length; i++) {
    var def = STANDARD_TRADE_DOC_DEFS[i];
    if (def.key === s || def.key.replace(/[\s\-_]+/g, "") === clean) {
      return def.key;
    }
    for (var j = 0; j < def.aliases.length; j++) {
      var a = def.aliases[j];
      if (a === s || a.replace(/[\s\-_]+/g, "") === clean) {
        return def.key;
      }
    }
  }
  return null;
}

function findEvidenceForCheckItem(docKey, itemTitle, itemDetail) {
  var searchText = (String(itemTitle || "") + " " + String(itemDetail || "")).toLowerCase();
  
  // 키워드 ➔ 스키마 필드 매핑 규칙
  var KEYWORD_RULES = [
    { regex: /신용장|lc|l\/c/i, fields: ["lc_number"] },
    { regex: /송장\s*번호|invoice\s*no/i, fields: ["invoice_number"] },
    { regex: /송장|인보이스/i, fields: ["invoice_number", "invoice_date"] },
    { regex: /선하증권|b\/?l\s*번호/i, fields: ["bl_number"] },
    { regex: /선하증권|b\/?l/i, fields: ["bl_number", "shipment_date", "on_board_date"] },
    { regex: /보험증권\s*번호|policy/i, fields: ["policy_certificate_number"] },
    { regex: /보험|담보/i, fields: ["policy_certificate_number", "policy_issue_date", "coverage_clauses_text", "insured_amount"] },
    { regex: /원산지|증명서\s*번호|certificate/i, fields: ["certificate_number", "country_of_origin"] },
    { regex: /만기일|유효기일|expiry/i, fields: ["expiry_date"] },
    { regex: /선적일|본선적재|선적기한|on\s*board|shipment/i, fields: ["latest_shipment_date", "shipment_date", "on_board_date"] },
    { regex: /양하항|도착항|discharge/i, fields: ["port_of_discharge"] },
    { regex: /선적항|선적지|loading/i, fields: ["port_of_loading"] },
    { regex: /수출자|송하인|판매자|수익자|seller|shipper|beneficiary/i, fields: ["seller_name", "shipper_name", "beneficiary_name", "exporter_name"] },
    { regex: /수입자|수하인|구매자|개설의뢰인|applicant|buyer|consignee/i, fields: ["buyer_name", "consignee_name", "applicant_name", "importer_name"] },
    { regex: /금액|통화|amount|currency/i, fields: ["total_amount", "credit_amount", "insured_amount"] },
    { regex: /포장수량|수량|package|carton|ctn/i, fields: ["total_package_count", "package_count", "cargo_details.package_count", "line_items.quantity"] },
    { regex: /중량|총중량|순중량|weight|kg/i, fields: ["total_gross_weight", "cargo_details.gross_weight", "total_net_weight"] },
    { regex: /용적|cbm|measurement/i, fields: ["total_measurement_cbm", "cargo_details.measurement_cbm"] },
    { regex: /클린\s*온보드|클린|clean/i, fields: ["on_board_date", "bl_number"] },
    { regex: /담보조건|약관|보험조건/i, fields: ["coverage_clauses_text", "insured_amount"] },
    { regex: /선박|모선|항차|vessel|voyage/i, fields: ["vessel_name", "voyage_number"] },
    { regex: /요구서류|충족\s*여부|required/i, fields: ["required_documents", "document_type"] },
    { regex: /참조번호|reference/i, fields: ["reference_number", "po_number"] },
    { regex: /b\/?l\s*번호|선하증권/i, fields: ["bl_number", "related_bl_number"] },
    { regex: /결제기한|지급기한|결제조건|지급조건|due\s*date/i, fields: ["payment_due_date", "due_date", "payment_terms"] },
    { regex: /hs코드|hscode|hs\s*code/i, fields: ["hs_code", "line_items.hs_code", "line_items.product_name"] }
  ];

  var candidateFields = [];
  for (var r = 0; r < KEYWORD_RULES.length; r++) {
    if (KEYWORD_RULES[r].regex.test(searchText)) {
      candidateFields = candidateFields.concat(KEYWORD_RULES[r].fields);
    }
  }

  // A. document_extract_evidence[docKey] 에서 검색
  var rawStructured = currentRawPayload && (currentRawPayload.structured_result || (currentRawPayload.instruct_result && currentRawPayload.instruct_result.structured_result));
  var docExtractEv = (rawStructured && rawStructured.document_extract_evidence) || {};
  var docEvObj = docExtractEv[docKey] || {};

  for (var f = 0; f < candidateFields.length; f++) {
    var fn = candidateFields[f];
    var hit = docEvObj[fn];
    if (hit) {
      var normS = normalizeSource(hit.source || hit.evidence || hit);
      if (normS && normS.page > 0) return normS;
    }
  }

  // B. currentExtractDocMap[docKey] 에서 검색
  if (currentExtractDocMap) {
    var fldMap = currentExtractDocMap[docKey] || {};
    for (var f2 = 0; f2 < candidateFields.length; f2++) {
      var fn2 = candidateFields[f2];
      var rawF = fldMap[fn2];
      if (rawF) {
        var src = (typeof convertOcrLocationToBox === "function" ? convertOcrLocationToBox(rawF) : null) || normalizeSource(rawF);
        if (src && src.page > 0) return src;
      }
    }
  }

  // C. currentCheckItemEvidence 에서 검색
  if (currentCheckItemEvidence && currentCheckItemEvidence.length > 0) {
    for (var ci = 0; ci < currentCheckItemEvidence.length; ci++) {
      var cie = currentCheckItemEvidence[ci];
      if (cie && cie.documents && cie.documents[docKey]) {
        var dObj = cie.documents[docKey];
        var s = normalizeSource(dObj.source || dObj.evidence || dObj);
        if (s && s.page > 0) {
          if (candidateFields.indexOf(dObj.field_name) >= 0 || searchText.indexOf(String(cie.check_item || "").toLowerCase()) >= 0) {
            return s;
          }
        }
      }
    }
  }

  // D. default 서류 기본 페이지 fallback
  var sIdx = currentActiveSampleIndex || 1;
  var reg = SAMPLE_DOC_REGISTRY[sIdx] || SAMPLE_DOC_REGISTRY[1];
  var defPage = (reg.docPages && reg.docPages[docKey]) ? reg.docPages[docKey] : 1;
  return { page: defPage, boxes: [] };
}

function enrichChecklistWithApiExtractions(rawChecklists) {
  var normalizedData = {};

  // 1. 입력 rawChecklists에서 6대 정규 서류 키만 매핑 (파이프라인 중간 단계 및 덤프 배제)
  if (rawChecklists && typeof rawChecklists === "object") {
    if (Array.isArray(rawChecklists)) {
      // checklist_results 배열 형태인 경우
      rawChecklists.forEach(function (it) {
        if (!it) return;
        var stdKey = normalizeToStandardDocKey(it.document_type || it.docKey);
        if (!stdKey) return;
        if (!normalizedData[stdKey]) normalizedData[stdKey] = [];
        normalizedData[stdKey].push({
          item: cleanText(it.summary || it.item || it.title || "국제표준규칙 준수 점검"),
          status: it.status || "pass",
          details: cleanText(it.detail || it.details || it.summary || ""),
          observed_value: it.observed_value != null ? cleanText(it.observed_value) : (it.value != null ? cleanText(it.value) : ""),
          check_item: it.check_item || null,
          source: normalizeSource(it.source || it.evidence)
        });
      });
    } else {
      // document_checklists 객체 형태인 경우
      Object.keys(rawChecklists).forEach(function (rawKey) {
        var stdKey = normalizeToStandardDocKey(rawKey);
        if (!stdKey) return; // 파이프라인 단계나 비정규 키 무시
        if (!normalizedData[stdKey]) normalizedData[stdKey] = [];

        var items = rawChecklists[rawKey];
        if (Array.isArray(items)) {
          items.forEach(function (it) {
            if (!it) return;
            normalizedData[stdKey].push({
              item: cleanText(it.item || it.title || "규정 준수 점검"),
              status: it.status || "pass",
              details: cleanText(it.detail || it.details || it.desc || ""),
              observed_value: it.observed_value != null ? cleanText(it.observed_value) : (it.value != null ? cleanText(it.value) : ""),
              check_item: it.check_item || null,
              source: normalizeSource(it.source || it.evidence)
            });
          });
        }
      });
    }
  }

  // 2. 만약 특정 서류가 normalizedData에 아예 없지만 comparison_matrix에 데이터가 있는 경우 보강
  var structured = currentRawPayload && (currentRawPayload.structured_result || (currentRawPayload.instruct_result && currentRawPayload.instruct_result.structured_result) || currentRawPayload);
  var compMatrix = (structured && structured.comparison_matrix) || [];
  if (compMatrix.length > 0) {
    STANDARD_TRADE_DOC_DEFS.forEach(function (def) {
      var stdKey = def.key;
      if (normalizedData[stdKey] && normalizedData[stdKey].length > 0) return; // 이미 체크리스트 있음

      // comparison_matrix에서 이 서류에 값이 있는 항목들 추출
      var relevantChecks = [];
      compMatrix.forEach(function (row) {
        if (!row) return;
        var val = row[stdKey];
        if (val !== undefined && val !== null && String(val).trim() !== "" && String(val).trim() !== "-") {
          relevantChecks.push({
            item: cleanText(row.check_item_ko || row.check_item || "일치성 점검"),
            status: row.result || row.verdict || "pass",
            details: row.note ? cleanText(row.note) : (row.notes ? cleanText(row.notes) : "확인됨"),
            observed_value: cleanText(val),
            check_item: row.check_item
          });
        }
      });

      if (relevantChecks.length > 0) {
        normalizedData[stdKey] = relevantChecks;
      }
    });
  }

  // 2.3 v17 B/L hs_code 체크리스트 자동 보강
  var blEv = (structured && structured.document_extract_evidence && structured.document_extract_evidence.bill_of_lading);
  if (blEv && blEv.hs_code && hasMeaningfulValue(blEv.hs_code.value || blEv.hs_code)) {
    if (!normalizedData.bill_of_lading) normalizedData.bill_of_lading = [];
    var existBlHs = normalizedData.bill_of_lading.some(function (it) {
      return it.check_item === "hs_code" || (it.item && it.item.indexOf("HS") >= 0);
    });
    if (!existBlHs) {
      var blHsVal = typeof blEv.hs_code === "object" ? blEv.hs_code.value : blEv.hs_code;
      normalizedData.bill_of_lading.push({
        item: "HS 코드 확인",
        status: "pass",
        details: "B/L 명시 기재됨",
        observed_value: cleanText(blHsVal),
        check_item: "hs_code",
        source: normalizeSource(blEv.hs_code.source || blEv.hs_code.evidence || blEv.hs_code)
      });
    }
  }

  // 2.5 v17 other_document 확장 필드 자동 보강 (관련 B/L, 금액, 결제기한, HS code, 선적항/양하항, 물품요약, 포장수량 등)
  var otherEv = (structured && structured.document_extract_evidence && structured.document_extract_evidence.other_document) || {};
  var otherExtFields = [
    { key: "document_title", label: "문서 제목" },
    { key: "reference_number", label: "참조 번호" },
    { key: "related_lc_number", label: "관련 L/C 번호" },
    { key: "related_invoice_number", label: "관련 송장 번호" },
    { key: "related_bl_number", label: "관련 B/L 번호" },
    { key: "document_date", label: "문서 일자" },
    { key: "amount", label: "금액", altKey: "total_amount" },
    { key: "payment_due_date", label: "결제기한", altKey: "due_date" },
    { key: "payment_terms", label: "결제조건" },
    { key: "hs_code", label: "HS 코드" },
    { key: "port_of_loading", label: "선적항" },
    { key: "port_of_discharge", label: "양하항" },
    { key: "goods_summary", label: "물품 요약" },
    { key: "package_count", label: "포장 수량" },
    { key: "issuer_or_sender_name", label: "발행/발송처" },
    { key: "receiver_or_beneficiary_name", label: "수신/수익자" }
  ];

  if (!normalizedData.other_document) normalizedData.other_document = [];
  otherExtFields.forEach(function (fld) {
    var fHit = otherEv[fld.key] || (fld.altKey ? otherEv[fld.altKey] : null);
    if (fHit && hasMeaningfulValue(fHit.value || fHit)) {
      var exist = normalizedData.other_document.some(function (it) {
        return it.check_item === fld.key || it.item === fld.label;
      });
      if (!exist) {
        var fVal = typeof fHit === "object" ? fHit.value : fHit;
        normalizedData.other_document.push({
          item: fld.label,
          status: "pass",
          details: "값 확인됨",
          observed_value: cleanText(fVal),
          check_item: fld.key,
          source: normalizeSource(fHit.source || fHit.evidence || fHit)
        });
      }
    }
  });

  // 3. 각 체크리스트 항목에 원본 PDF 증거(BBox 및 Page) 스마트 바인딩
  Object.keys(normalizedData).forEach(function (stdKey) {
    var list = normalizedData[stdKey];
    list.forEach(function (item) {
      if (!item.source || !item.source.page) {
        var foundSrc = findEvidenceForCheckItem(stdKey, item.item, item.details || item.observed_value);
        if (foundSrc) {
          item.source = foundSrc;
          item.page = foundSrc.page;
          item.box = (foundSrc.boxes && foundSrc.boxes.length > 0) ? foundSrc.boxes[0] : null;
        }
      } else {
        item.page = item.source.page;
        item.box = (item.source.boxes && item.source.boxes.length > 0) ? item.source.boxes[0] : null;
      }
    });
  });

  return normalizedData;
}

function selectChecklistTab(docKey) {
  if (!currentChecklistData || !currentChecklistData[docKey]) return;

  activeChecklistTab = docKey;

  // Update tab buttons active state
  var buttons = els.checklistTabs.querySelectorAll(".tab-btn");
  buttons.forEach(function (btn) {
    if (btn.getAttribute("data-key") === docKey) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  // Render checklist items
  var items = currentChecklistData[docKey];
  var html = "";
  var i;
  var item;
  var statusBadge = "badge-neutral";

  if (!items || !items.length) {
    els.checklistContent.innerHTML = '<div class="empty-cell">해당 서류의 체크리스트 항목이 없습니다.</div>';
    return;
  }

  for (i = 0; i < items.length; i += 1) {
    item = items[i];
    statusBadge = badgeClass(item.status);

    var hasLoc = item.source && item.source.page > 0;
    var pageNum = hasLoc ? item.source.page : (item.page || 0);

    var itemClass = "checklist-item" + (pageNum > 0 ? " clickable-checklist-item" : "");
    var rowTooltip = pageNum > 0 ? "클릭 시 원본 PDF (p." + pageNum + ") 위치로 이동" : "";

    var obsVal = cleanText(item.observed_value != null ? item.observed_value : (item.extracted_value != null ? item.extracted_value : (item.value != null ? item.value : "")));
    var detailText = cleanText(item.details || item.desc || "");
    var titleText = cleanText(item.item || item.title || "점검 항목");

    html += '<div class="' + itemClass + '" data-doc="' + escapeHtml(docKey) + '" data-idx="' + i + '" title="' + escapeHtml(rowTooltip) + '">';
    html += '<div class="checklist-item-left">';
    html += '<span class="checklist-item-title">' + escapeHtml(titleText) + '</span>';
    if (detailText) {
      html += '<span class="checklist-detail-chip" title="판정 세부">' + escapeHtml(detailText) + '</span>';
    }
    if (obsVal) {
      html += '<div class="checklist-observed-box">';
      html += '<span class="checklist-observed-label"><i class="bi bi-tag-fill"></i> 추출값:</span>';
      html += '<span class="checklist-observed-val">' + escapeHtml(obsVal) + '</span>';
      html += '</div>';
    }
    html += '</div>';
    html += '<div class="checklist-status-wrap"><span class="' + statusBadge + '">' + escapeHtml(koreanStatus(item.status)) + '</span></div>';
    html += '</div>';
  }

  els.checklistContent.innerHTML = html;

  // Bind click listeners to open PDF viewer and jump to BBox
  var clickableItems = els.checklistContent.querySelectorAll(".clickable-checklist-item");
  clickableItems.forEach(function (el) {
    el.addEventListener("click", function () {
      var idx = parseInt(this.getAttribute("data-idx"), 10);
      var itemObj = items[idx];
      if (!itemObj) return;

      var targetPage = (itemObj.source && itemObj.source.page > 0) ? itemObj.source.page : (itemObj.page || 1);
      var targetBox = (itemObj.source && itemObj.source.boxes && itemObj.source.boxes[0]) ? itemObj.source.boxes[0] : (itemObj.box || null);
      var rawTitle = itemObj.item || itemObj.title || "점검 항목";
      var koTitle = toKoreanLabel(rawTitle, docKey);
      var targetLabel = koTitle + (itemObj.details ? ": " + String(itemObj.details).slice(0, 30) : "");

      openDocViewer(currentActiveSampleIndex || 1, targetPage, targetBox, targetLabel);
    });
  });
}

function renderChecklists(documentChecklists) {
  if (!els.checklistTabs || !els.checklistContent) return;

  // 6대 정규 무역서류 탭 고정 및 원문 증거 1:1 바인딩
  documentChecklists = enrichChecklistWithApiExtractions(documentChecklists || {});

  var hasAny = false;
  STANDARD_TRADE_DOC_DEFS.forEach(function (def) {
    if (documentChecklists[def.key] && documentChecklists[def.key].length > 0) {
      hasAny = true;
    }
  });

  if (!hasAny) {
    els.checklistTabs.innerHTML = "";
    els.checklistContent.innerHTML = '<div class="empty-cell">서류별 체크리스트 데이터가 없습니다.</div>';
    return;
  }

  currentChecklistData = documentChecklists;

  var tabsHtml = "";
  var firstActiveKey = null;

  STANDARD_TRADE_DOC_DEFS.forEach(function (def) {
    var key = def.key;
    var items = documentChecklists[key];
    if (!items || items.length === 0) return; // 데이터가 없는 서류 탭은 생략

    if (!firstActiveKey) firstActiveKey = key;

    var critCount = 0;
    var warnCount = 0;
    var passCount = 0;

    items.forEach(function (it) {
      var st = String(it.status || "").toLowerCase();
      if (st === "fail" || st === "crit" || st === "critical" || st === "mismatch" || st === "missing" || st.indexOf("불일치") >= 0) {
        critCount += 1;
      } else if (st === "warning" || st === "warn" || st === "review_required" || st === "unclear" || st.indexOf("검토") >= 0) {
        warnCount += 1;
      } else {
        passCount += 1;
      }
    });

    var tabClass = "tab-btn-neutral";
    if (critCount > 0) {
      tabClass = "tab-btn-crit";
    } else if (warnCount > 0) {
      tabClass = "tab-btn-warn";
    } else if (passCount > 0) {
      tabClass = "tab-btn-ok";
    }

    tabsHtml += '<button type="button" class="tab-btn ' + tabClass + '" data-key="' + escapeHtml(key) + '">';
    tabsHtml += '<span class="tab-label">' + escapeHtml(def.label) + '</span>';
    tabsHtml += '</button>';
  });

  els.checklistTabs.innerHTML = tabsHtml;

  // Bind tab click events
  var buttons = els.checklistTabs.querySelectorAll(".tab-btn");
  buttons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var k = this.getAttribute("data-key");
      selectChecklistTab(k);
    });
  });

  // Select first tab default
  if (firstActiveKey) {
    selectChecklistTab(firstActiveKey);
  }
}

function renderResult(parsed, finalJob) {
  var rawSource = parsed || finalJob;
  var data = normalizeResultPayload(rawSource);
  var rows = [];
  var overall = String(data.overall_status || "").toLowerCase();
  var alertLvl = String(data.overall_alert_level || "").toLowerCase();

  // 방법 B (Normalizer Lookup) 지원: data.check_results (자동 생성 포함) 우선 저장
  currentCheckResults = (data && Array.isArray(data.check_results) && data.check_results.length > 0)
    ? data.check_results
    : ((parsed && Array.isArray(parsed.check_results)) ? parsed.check_results : []);

  var structured = (data && data.comparison_matrix)
    ? data
    : ((parsed && parsed.instruct_result && parsed.instruct_result.structured_result)
      || (parsed && parsed.structured_result)
      || data);

  currentCheckItemEvidence = (data && Array.isArray(data.check_item_evidence))
    ? data.check_item_evidence
    : ((structured && Array.isArray(structured.check_item_evidence))
      ? structured.check_item_evidence
      : []);

  currentRawPayload = finalJob || parsed;
  els.rawJson.textContent = JSON.stringify(currentRawPayload, null, 2);

  /* Hide upper duplicated pills, keep only bottom description status badge */
  if (els.overallStatus) els.overallStatus.style.display = "none";
  if (els.alertLevel) els.alertLevel.style.display = "none";

  /* Render Single Korean Status Highlight & Full Card Background Theme */
  if (overall === "review_required" || overall === "검토 필요") {
    els.overallStatusDesc.innerHTML = '<span class="desc-status-highlight warn">진행 전 추가 검토 필요</span>';
    applyCardTheme(els.overallStatusCard, "card-theme-warn");
    applyCardTheme(els.recommendedActionCard, "card-theme-warn");
  } else if (overall === "proceed" || overall === "진행 가능") {
    els.overallStatusDesc.innerHTML = '<span class="desc-status-highlight ok">서류 일치 (진행 가능)</span>';
    applyCardTheme(els.overallStatusCard, "card-theme-ok");
    applyCardTheme(els.recommendedActionCard, "card-theme-ok");
  } else if (overall === "on_hold" || overall === "보류") {
    els.overallStatusDesc.innerHTML = '<span class="desc-status-highlight crit">불일치 발생 (보류)</span>';
    applyCardTheme(els.overallStatusCard, "card-theme-crit");
    applyCardTheme(els.recommendedActionCard, "card-theme-crit");
  } else {
    els.overallStatusDesc.innerHTML = '<span class="desc-status-highlight">' + escapeHtml(cleanText(data.overall_status) || "결과 확인") + '</span>';
    applyCardTheme(els.overallStatusCard, "card-theme-neutral");
    applyCardTheme(els.recommendedActionCard, "card-theme-neutral");
  }

  /* Render Single Korean Alert Level Highlight & Full Card Background Theme */
  if (alertLvl === "critical" || alertLvl === "치명") {
    els.alertLevelDesc.innerHTML = '<span class="desc-status-highlight crit">치명 이슈 포함</span>';
    applyCardTheme(els.alertLevelCard, "card-theme-crit");
  } else if (alertLvl === "warning" || alertLvl === "warn" || alertLvl === "주의") {
    els.alertLevelDesc.innerHTML = '<span class="desc-status-highlight warn">주의 필요</span>';
    applyCardTheme(els.alertLevelCard, "card-theme-warn");
  } else if (alertLvl === "info" || alertLvl === "참고") {
    els.alertLevelDesc.innerHTML = '<span class="desc-status-highlight ok">참고 수준</span>';
    applyCardTheme(els.alertLevelCard, "card-theme-ok");
  } else {
    els.alertLevelDesc.innerHTML = '<span class="desc-status-highlight">' + escapeHtml(cleanText(data.overall_alert_level) || "결과 확인") + '</span>';
    applyCardTheme(els.alertLevelCard, "card-theme-neutral");
  }

  // human_summary 지원 (instruct_result.human_summary, parsed.human_summary 또는 structured.human_summary 우선)
  var summaryText = (parsed && parsed.instruct_result && parsed.instruct_result.human_summary)
    || (parsed && parsed.human_summary)
    || (structured && structured.human_summary)
    || cleanText(data.one_line_summary)
    || "-";
  els.oneLineSummary.innerHTML = formatMultiSentenceHtml(summaryText);
  els.recommendedAction.innerHTML = formatMultiSentenceHtml(data.recommended_action);

  if (finalJob) {
    renderUsage(finalJob);
  }

  renderDocumentKeys(data.document_keys, structured, currentRawPayload);
  renderDateTimeline(data.date_checks);
  if (structured) enrichComparisonMatrix(structured);
  if (data) enrichComparisonMatrix(data);
  rows = (structured && structured.comparison_matrix) || data.comparison_matrix || [];
  renderComparisonTable(rows);
  renderChecklists((structured && structured.document_checklists) || data.document_checklists || (structured && structured.checklist_results));
}

function loadConfig() {
  var v = getCacheBuster();

  return fetch("./config.json?v=" + encodeURIComponent(v), {
    cache: "no-store"
  })
    .then(function (res) {
      if (!res.ok) {
        throw new Error("config.json 로드 실패");
      }
      return res.json();
    })
    .then(function (json) {
      CONFIG = json;
      if (CONFIG.defaultApiKey && !els.apiKey.value) {
        els.apiKey.value = CONFIG.defaultApiKey;
      }
      if (CONFIG.workerUrl && els.workerUrl) {
        els.workerUrl.value = CONFIG.workerUrl;
      }
      if (CONFIG.configId && els.configId) {
        els.configId.value = CONFIG.configId;
      } else if (els.configId) {
        els.configId.value = "";
      }
    });
}

function sanitizeUploadFilename(file) {
  var filename = (file && typeof file.name === "string") ? file.name : "";
  var mimeType = (file && typeof file.type === "string") ? file.type.toLowerCase() : "";
  
  var ext = "";
  if (filename) {
    var match = filename.match(/\.([a-zA-Z0-9]+)$/);
    if (match) ext = match[1].toLowerCase();
  }
  
  if (!ext) {
    if (mimeType.indexOf("pdf") >= 0) ext = "pdf";
    else if (mimeType.indexOf("jpeg") >= 0 || mimeType.indexOf("jpg") >= 0) ext = "jpg";
    else if (mimeType.indexOf("png") >= 0) ext = "png";
    else if (mimeType.indexOf("tiff") >= 0) ext = "tiff";
    else ext = "pdf";
  }

  var baseName = filename ? filename.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_") : "document";
  baseName = baseName.replace(/_+/g, "_").slice(0, 30);
  if (!baseName || baseName === "_") {
    baseName = "document_" + Date.now();
  }
  return baseName + "." + ext;
}

function uploadFile(apiKey, file) {
  if (!file || !(file instanceof Blob)) {
    return Promise.reject(new Error("업로드할 파일 객체가 유효하지 않습니다. 파일을 다시 선택해주세요."));
  }

  var safeFilename = sanitizeUploadFilename(file);
  var createForm = function () {
    var form = new FormData();
    try {
      var safeFile = new File([file], safeFilename, { type: file.type || "application/octet-stream" });
      form.append("file", safeFile);
    } catch (e) {
      form.append("file", file, safeFilename);
    }
    form.append("purpose", (CONFIG && CONFIG.filePurpose) || "user_data");
    return form;
  };

  var endpoint = getApiEndpoint("/files");

  var doFetch = function () {
    return fetch(endpoint, {
      method: "POST",
      mode: "cors",
      credentials: "omit",
      headers: {
        Authorization: "Bearer " + apiKey
      },
      body: createForm()
    }).then(function (res) {
      if (!res.ok) {
        return res.text().then(function (text) {
          var parsedMsg = text;
          try {
            var j = JSON.parse(text);
            if (j.error && j.error.message) parsedMsg = j.error.message;
            else if (j.message) parsedMsg = j.message;
          } catch (_) {}
          throw new Error("파일 업로드 실패 (HTTP " + res.status + "): " + parsedMsg);
        });
      }
      return res.json();
    });
  };

  return doFetch().catch(function (primaryErr) {
    var msg = String(primaryErr.message || "");
    if (msg.indexOf("HTTP ") >= 0) {
      throw primaryErr;
    }

    console.warn("파일 업로드 1차 실패, 1.5초 후 재시도:", primaryErr);
    setStatus("네트워크 지연 감지, 파일 업로드 재시도 중...", safeFilename);
    return wait(1500).then(function () {
      return doFetch();
    }).catch(function (retryErr) {
      console.error("파일 업로드 최종 실패:", retryErr);
      var retryMsg = String(retryErr.message || "");
      if (retryMsg.indexOf("Failed to fetch") >= 0 || retryMsg.indexOf("NetworkError") >= 0) {
        throw new Error(
          "프록시 서버(" + (els.workerUrl ? els.workerUrl.value : "") + ")에 연결할 수 없습니다. " +
          "모바일 Wi-Fi/데이터 연결 상태를 확인하시거나 상단의 [캐시 새로고침]을 눌러주세요."
        );
      }
      throw retryErr;
    });
  });
}

function validateUploadedFile(uploaded) {
  if (!uploaded || !uploaded.id) {
    throw new Error("업로드 응답에 file id가 없습니다.");
  }
  return uploaded;
}

function createJob(apiKey, fileId, configId) {
  var body = {
    model: (CONFIG && CONFIG.agentId) || "agt_hYy33EbPU93zggAb6W9z3G",
    include: ["all"],
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_file",
            file_id: fileId
          }
        ]
      }
    ]
  };

  var effectiveConfigId = (configId || (CONFIG && CONFIG.configId) || "").trim();
  if (effectiveConfigId) {
    body.config_id = effectiveConfigId;
  }

  var endpoint = getApiEndpoint("/responses");
  var jsonBody = JSON.stringify(body);

  var doFetch = function () {
    return fetch(endpoint, {
      method: "POST",
      mode: "cors",
      credentials: "omit",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json"
      },
      body: jsonBody
    }).then(function (res) {
      if (!res.ok) {
        return res.text().then(function (text) {
          var parsedMsg = text;
          try {
            var j = JSON.parse(text);
            if (j.error && j.error.message) parsedMsg = j.error.message;
            else if (j.message) parsedMsg = j.message;
          } catch (_) {}
          throw new Error("Job 생성 실패 (HTTP " + res.status + "): " + parsedMsg);
        });
      }
      return res.json();
    });
  };

  return doFetch().catch(function (primaryErr) {
    var msg = String(primaryErr.message || "");
    if (msg.indexOf("HTTP ") >= 0) {
      throw primaryErr;
    }
    console.warn("Job 생성 1차 실패, 재시도 중:", primaryErr);
    return wait(1500).then(function () {
      return doFetch();
    });
  });
}

function getJob(apiKey, jobId) {
  var queryPath = "/responses/" + encodeURIComponent(jobId) + "?include[]=all";
  var endpoint = getApiEndpoint(queryPath);

  return fetch(endpoint, {
    method: "GET",
    mode: "cors",
    credentials: "omit",
    headers: {
      Authorization: "Bearer " + apiKey
    }
  }).then(function (res) {
    if (!res.ok) {
      return res.text().then(function (text) {
        var parsedMsg = text;
        try {
          var j = JSON.parse(text);
          if (j.error && j.error.message) parsedMsg = j.error.message;
          else if (j.message) parsedMsg = j.message;
        } catch (_) {}
        throw new Error("Job 상태 조회 실패 (HTTP " + res.status + "): " + parsedMsg);
      });
    }
    return res.json();
  });
}

function wait(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

function pollJob(apiKey, jobId) {
  var consecutiveErrors = 0;
  var maxConsecutiveErrors = 5;
  var pollCount = 0;
  var startTime = Date.now();
  var maxTimeoutMs = 10 * 60 * 1000; // 최대 10분 안전 제한

  return new Promise(function (resolve, reject) {
    function loop() {
      // 다른 작업으로 교체되었거나 새 작업이 시작된 경우 이전 루프 중단
      if (currentJobId && currentJobId !== jobId) {
        console.warn("이전 Job(" + jobId + ") 폴링이 중단되었습니다.");
        return;
      }

      var elapsedMs = Date.now() - startTime;
      var elapsedSec = Math.round(elapsedMs / 1000);

      // 최대 대기 시간 초과 가드
      if (elapsedMs > maxTimeoutMs) {
        var timeoutErr = new Error("Job 처리 대기 시간이 10분을 초과했습니다. API 서버 부하가 높을 수 있으니 상단의 [Job ID 직접 조회]로 나중에 확인해주세요.");
        reject(timeoutErr);
        return;
      }

      pollCount++;

      getJob(apiKey, jobId)
        .then(function (job) {
          consecutiveErrors = 0;
          var statusText = job.status || "진행 중";
          setStatus("AI 정밀 심사 진행 중 (" + elapsedSec + "초 경과, " + pollCount + "회차 확인)... 상태: " + statusText, "job_id=" + job.id);

          if (job.status === "completed" || job.status === "failed") {
            resolve(job);
            return;
          }

          // 지능형 점진적 백오프 (Adaptive Backoff) - API 서버 부하 및 네트워크 낭비 70% 이상 경감
          // 0~20초: 3.5초 간격
          // 20~60초: 5초 간격
          // 60~180초 (1~3분): 8초 간격
          // 180초 (3분) 이상: 12초 간격
          var nextIntervalMs = (CONFIG && CONFIG.pollIntervalMs) || 3500;
          if (elapsedSec > 180) {
            nextIntervalMs = 12000;
          } else if (elapsedSec > 60) {
            nextIntervalMs = 8000;
          } else if (elapsedSec > 20) {
            nextIntervalMs = Math.max(nextIntervalMs, 5000);
          }

          wait(nextIntervalMs).then(loop);
        })
        .catch(function (err) {
          consecutiveErrors++;
          console.warn("Job 조회 일시 실패 (" + consecutiveErrors + "/" + maxConsecutiveErrors + "):", err);
          if (consecutiveErrors < maxConsecutiveErrors) {
            setStatus("네트워크 일시 재연결 시도 중 (" + consecutiveErrors + "/" + maxConsecutiveErrors + ", " + elapsedSec + "초 경과)", "job_id=" + jobId);
            wait(4000).then(loop);
          } else {
            reject(err);
          }
        });
    }

    loop();
  });
}

function extractResultText(finalJob) {
  if (!finalJob) return null;

  // 0) steps 또는 output 배열이 여러 단계인 Agent 풀 워크플로우 응답 (include: ["all"])
  if ((Array.isArray(finalJob.steps) && finalJob.steps.length > 0) || (Array.isArray(finalJob.output) && finalJob.output.length > 1)) {
    return finalJob;
  }

  // 1) output_text (최신 Studio Agent shortcut)
  if (finalJob.output_text) {
    return finalJob.output_text;
  }

  // 2) content (sample1, sample2 등 래핑 응답 대응)
  if (finalJob.content) {
    return finalJob.content;
  }

  // 3) structured_result가 최상위에 직접 있는 경우
  if (finalJob.structured_result || finalJob.instruct_result || finalJob.check_results) {
    return finalJob.structured_result || finalJob;
  }

  // 4) output 배열 순회
  if (finalJob.output && Array.isArray(finalJob.output) && finalJob.output.length > 0) {
    for (var i = finalJob.output.length - 1; i >= 0; i--) {
      var item = finalJob.output[i];
      if (item && Array.isArray(item.content)) {
        for (var j = 0; j < item.content.length; j++) {
          var c = item.content[j];
          if (c && c.text) return c.text;
          if (c && c.output_text) return c.output_text;
        }
      }
    }
  }

  // 5) 최상위 자체가 분석 결과 데이터인 경우
  if (finalJob.overall_status || finalJob.document_keys || finalJob.comparison_matrix) {
    return finalJob;
  }

  return null;
}

function parseResultText(rawText) {
  if (!rawText) return {};
  if (typeof rawText === "object") {
    return rawText;
  }
  try {
    return JSON.parse(rawText);
  } catch (e) {
    console.error("결과 JSON 파싱 실패:", e, rawText);
    throw new Error("결과 JSON 파싱 실패: " + e.message + "\n원문: " + String(rawText).slice(0, 100));
  }
}

/* Run Job Lookup by Job ID */
function lookupExistingJob() {
  var apiKey = trimValue(els.apiKey.value);
  var jobId = trimValue(els.lookupJobId ? els.lookupJobId.value : "");

  if (!apiKey) {
    alert("API Key를 입력하세요.");
    return;
  }

  if (!jobId) {
    alert("조회할 Job ID (res_...)를 입력하세요.");
    return;
  }

  clearResult();
  setStatus("Job 조회 중...", "job_id=" + jobId);

  getJob(apiKey, jobId)
    .then(function (finalJob) {
      var rawText;
      var parsed;

      els.rawJson.textContent = JSON.stringify(finalJob, null, 2);

      if (finalJob.status === "failed") {
        setStatus("실행 실패된 Job", "job_id=" + jobId);
        alert("실행 실패된 Job입니다. Raw JSON을 확인하세요.");
        return;
      }

      rawText = extractResultText(finalJob);

      if (!rawText) {
        setStatus("조회 완료 (결과 텍스트 없음)", "job_id=" + jobId);
        return;
      }

      parsed = parseResultText(rawText);
      renderResult(parsed, finalJob);
      setStatus("조회 완료: " + finalJob.status, "job_id=" + jobId);
    })
    .catch(function (error) {
      console.error(error);
      setStatus("조회 실패", error.message);
      alert("Job 조회 실패: " + error.message);
    });
}

/* 1-Click JSON Helpers */
function copyJsonToClipboard() {
  if (!currentRawPayload) {
    alert("복사할 결과가 없습니다.");
    return;
  }
  var jsonStr = JSON.stringify(currentRawPayload, null, 2);
  navigator.clipboard.writeText(jsonStr).then(function () {
    alert("📋 Raw JSON이 클립보드에 복사되었습니다!");
  }).catch(function (err) {
    alert("복사 실패: " + err.message);
  });
}

function downloadJsonFile() {
  if (!currentRawPayload) {
    alert("다운로드할 결과가 없습니다.");
    return;
  }
  var jsonStr = JSON.stringify(currentRawPayload, null, 2);
  var blob = new Blob([jsonStr], { type: "application/json" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = "upstage_trade_job_result.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ==========================================================================
   Supabase Storage & DB Integration (Core Platform Pipeline)
   ========================================================================== */

function initSupabaseClient() {
  if (CONFIG && CONFIG.supabase && CONFIG.supabase.url && CONFIG.supabase.anonKey && window.supabase) {
    try {
      supabaseClient = window.supabase.createClient(CONFIG.supabase.url, CONFIG.supabase.anonKey);
      console.log("Supabase Client initialized successfully");
    } catch (e) {
      console.warn("Supabase Client initialization error:", e);
    }
  }
}

/**
 * DB에서 최신 데이터셋을 조회하여 콤보박스에 표시 (사용자 요구사항 1)
 * LC NO 기준 중복없이, Top 5
 */
async function loadRecentDatasetsFromDb() {
  if (!supabaseClient || !els.sampleSelect) return;
  try {
    var res = await supabaseClient
      .from("ocr_history")
      .select("id, created_at, file_name, storage_path, pdf_url, lc_no, applicant, beneficiary, status, mismatch_count, api_info")
      .order("created_at", { ascending: false })
      .limit(50);

    if (res.error) {
      console.warn("DB Recent Datasets query error:", res.error);
      return;
    }

    var records = res.data || [];
    if (records.length === 0) return;

    // LC NO 기준 중복없이, Top 5
    var seenLc = new Set();
    var top5Records = [];
    records.forEach(function (rec) {
      var lc = (rec.lc_no || "").trim();
      var key = (lc && lc !== "-" && lc !== "미기재") ? ("LC:" + lc.toUpperCase()) : ("FILE:" + (rec.file_name || rec.id));
      if (!seenLc.has(key)) {
        seenLc.add(key);
        top5Records.push(rec);
      }
    });
    top5Records = top5Records.slice(0, 5);

    // 기존 동적 optgroup 제거 후 새로 생성
    var existingGroup = els.sampleSelect.querySelector("optgroup[data-db-group='true']");
    if (existingGroup) {
      existingGroup.remove();
    }

    var optgroup = document.createElement("optgroup");
    optgroup.setAttribute("label", "🗄️ 최근 점검 DB 서류 (L/C 기준 Top 5)");
    optgroup.setAttribute("data-db-group", "true");

    top5Records.forEach(function (rec, idx) {
      var opt = document.createElement("option");
      opt.value = "db:" + rec.id;
      var d = new Date(rec.created_at);
      var dateStr = (d.getMonth() + 1) + "/" + d.getDate() + " " + String(d.getHours()).padStart(2, '0') + ":" + String(d.getMinutes()).padStart(2, '0');
      var lcText = rec.lc_no && rec.lc_no !== "-" ? rec.lc_no : "L/C 미지정";
      var statusIcon = String(rec.status).toUpperCase() === "MATCH" ? "🟢" : "🔴";
      opt.textContent = `${statusIcon} [DB #${idx + 1}] ${rec.file_name} (L/C: ${lcText} · ${dateStr})`;
      optgroup.appendChild(opt);
    });

    els.sampleSelect.appendChild(optgroup);

    // URL에 ?id=xxx 가 있다면 콤보박스 선택값도 동기화
    var urlParams = new URLSearchParams(window.location.search);
    var curId = urlParams.get("id");
    if (curId) {
      els.sampleSelect.value = "db:" + curId;
    }
  } catch (err) {
    console.error("loadRecentDatasetsFromDb error:", err);
  }
}

async function loadInspectionFromDbById(recordId) {
  if (!supabaseClient) return;
  try {
    setStatus("DB에서 서류 불러오는 중...", "id=" + recordId);
    if (els.fileInfo) {
      els.fileInfo.innerHTML = '<span class="meta-text"><i class="bi bi-hourglass-split"></i> DB에서 서류 데이터를 로드하고 있습니다...</span>';
    }

    var res = await supabaseClient
      .from("ocr_history")
      .select("*")
      .eq("id", recordId)
      .single();

    if (res.error) throw res.error;
    var data = res.data;
    if (!data) throw new Error("해당 ID의 점검 기록을 찾을 수 없습니다.");

    // Update banner
    var banner = document.getElementById("supabaseBanner");
    var bannerText = document.getElementById("supabaseBannerText");
    if (banner && bannerText) {
      banner.style.display = "flex";
      var isMatch = String(data.status || "").toUpperCase() === "MATCH";
      var badgeHtml = isMatch
        ? '<span style="color:#10b981; font-weight:700;"><i class="bi bi-check-circle-fill"></i> 정상 일치 (MATCH)</span>'
        : '<span style="color:#ef4444; font-weight:700;"><i class="bi bi-exclamation-triangle-fill"></i> 불일치 (' + (data.mismatch_count || 1) + '건)</span>';
      bannerText.innerHTML = `
        <i class="bi bi-database-check" style="color:#10b981; font-size:18px;"></i>
        <span><strong>[DB 점검 이력]</strong> ${escapeHtml(data.file_name)} · L/C: <strong>${escapeHtml(data.lc_no || "-")}</strong> · 수입자: <strong>${escapeHtml(data.applicant || "-")}</strong> · 판정: ${badgeHtml}</span>
      `;
    }

    // Set file info in left panel
    if (els.fileInfo) {
      els.fileInfo.innerHTML = "<strong>[DB 이력] " + escapeHtml(data.file_name) + "</strong> <br><span class=\"meta-text\">(" + escapeHtml(data.storage_path || "") + ")</span>";
    }

    // Configure PDF viewer
    currentCustomPdfUrl = data.pdf_url;
    docViewerState.currentDocName = data.file_name;
    selectedFile = null;
    if (els.fileInput) els.fileInput.value = "";

    // Render result
    if (data.result_json) {
      var rawText = extractResultText(data.result_json);
      var parsed = parseResultText(rawText);
      renderResult(parsed, data.result_json);
    }

    if (els.lookupJobId && data.id) {
      els.lookupJobId.value = data.id;
    }
    setStatus("DB 이력 표시 완료 (" + data.file_name + ")", "id=" + data.id);

    // Auto update floating viewer if open
    if (els.docViewerFloating && els.docViewerFloating.style.display !== "none") {
      openDocViewer(null, 1, null, null);
    }
  } catch (err) {
    console.error("DB Load Error:", err);
    alert("DB 서류 로드 실패: " + err.message);
    setStatus("DB 서류 로드 실패", err.message);
  }
}

async function checkUrlParamAndLoadFromDb() {
  try {
    var urlParams = new URLSearchParams(window.location.search);
    var recordId = urlParams.get("id");
    if (!recordId || !supabaseClient) return;
    await loadInspectionFromDbById(recordId);
  } catch (err) {
    console.error("checkUrlParamAndLoadFromDb Error:", err);
  }
}

/**
 * AI-OCR 판독 신뢰도 산출 (사용자 질문 4 대응)
 */
function calculateOcrReliability(parsed, finalJob) {
  // 0순위: API v14 결과값에 직접 신뢰성 수치가 제공된 경우
  if (parsed && typeof parsed === "object") {
    var apiScore = parsed.ocr_reliability_score != null ? parsed.ocr_reliability_score :
                   (parsed.reliability_score != null ? parsed.reliability_score :
                   (parsed.overall_confidence_score != null ? parsed.overall_confidence_score : null));
    if (typeof apiScore === "number") {
      var s = apiScore > 1 ? apiScore : Math.round(apiScore * 1000) / 10;
      s = Math.max(50, Math.min(100, Math.round(s * 10) / 10));
      return {
        score: s,
        grade: s >= 95 ? "HIGH" : (s >= 85 ? "MED" : "LOW"),
        statusText: s >= 95 ? "우수" : (s >= 85 ? "보통" : "주의"),
        from_api: true
      };
    }
  }

  var confScores = [];
  var noisyFields = 0;

  if (finalJob) {
    var stepsList = Array.isArray(finalJob.output) ? finalJob.output : (Array.isArray(finalJob.steps) ? finalJob.steps : []);
    stepsList.forEach(function (st) {
      if (!st || !Array.isArray(st.content)) return;
      st.content.forEach(function (c) {
        if (!c || !c.additional_values) return;
        var av = typeof c.additional_values === "string" ? JSON.parse(c.additional_values) : c.additional_values;
        if (!av) return;
        Object.keys(av).forEach(function (k) {
          var fld = av[k];
          if (fld && typeof fld === "object") {
            if (typeof fld.confidence_score === "number") {
              confScores.push(fld.confidence_score);
            }
          }
        });
      });
    });
  }

  if (parsed && Array.isArray(parsed.discrepancy_candidates)) {
    parsed.discrepancy_candidates.forEach(function (dc) {
      if (dc && (dc.issue_type === "reading_unclear" || dc.issue_type === "ocr_noise")) {
        noisyFields++;
      }
    });
  }

  var score = 96.5;
  if (confScores.length > 0) {
    var avg = confScores.reduce(function (a, b) { return a + b; }, 0) / confScores.length;
    score = Math.round(avg * 1000) / 10;
  }
  score = Math.max(70, Math.min(99.9, score - (noisyFields * 4)));
  var grade = score >= 95 ? "HIGH" : (score >= 85 ? "MED" : "LOW");
  var statusText = score >= 95 ? "우수" : (score >= 85 ? "보통" : "주의");

  return {
    score: score,
    grade: grade,
    statusText: statusText,
    noisy_fields_count: noisyFields
  };
}

async function saveInspectionToSupabase(file, storagePath, pdfUrl, parsed, finalJob, configId) {
  if (!supabaseClient) return;
  try {
    // 1. Upstage v14/v15 응답 구조 정규화 (instruct_result, structured_result, steps, output 등)
    var normPayload = (typeof normalizeResultPayload === "function")
      ? normalizeResultPayload(parsed || finalJob)
      : (parsed || {});
    
    if (typeof enrichComparisonMatrix === "function" && normPayload) {
      try { enrichComparisonMatrix(normPayload); } catch (e) {}
    }

    var matrix = (normPayload && Array.isArray(normPayload.comparison_matrix))
      ? normPayload.comparison_matrix
      : ((parsed && Array.isArray(parsed.comparison_matrix)) ? parsed.comparison_matrix : []);

    var docKeys = (normPayload && normPayload.document_keys) || (parsed && parsed.document_keys) || {};

    // 2. L/C 번호 추출 (우선순위: docKeys -> comparison_matrix -> 파일명)
    var lcNo = docKeys.lc_number || docKeys.lc_no || docKeys.lcNumber || "";
    if (!lcNo || lcNo === "-") {
      var lcRow = matrix.find(function (x) {
        var key = String(x.check_item || x.item || "").toLowerCase();
        var ko = String(x.check_item_ko || x.label || "");
        return key.indexOf("lc_number") >= 0 || ko.indexOf("l/c") >= 0 || ko.indexOf("신용장") >= 0;
      });
      if (lcRow) {
        lcNo = lcRow.lc || lcRow.commercial_invoice || lcRow.bill_of_lading || lcRow.packing_list || "";
      }
    }
    if (!lcNo || lcNo === "-") {
      var fMatch = String(file && file.name || "").match(/[A-Z0-9]{12,18}/);
      if (fMatch) lcNo = fMatch[0];
    }
    lcNo = (lcNo && lcNo !== "-") ? String(lcNo).trim() : "-";

    // 3. 당사자(수입자/수출자) 값 추출 헬퍼
    function getPartyValue(row) {
      if (!row) return "";
      var cands = [
        row.commercial_invoice,
        row.packing_list,
        row.bill_of_lading,
        row.bl,
        row.lc,
        row.certificate_of_origin,
        row.coo,
        row.insurance,
        row.extra,
        row.others,
        row.other
      ];
      for (var i = 0; i < cands.length; i++) {
        var v = String(cands[i] || "").trim();
        if (v && v !== "-" && v !== "null" && v !== "undefined") return v;
      }
      var keys = Object.keys(row);
      for (var j = 0; j < keys.length; j++) {
        var k = keys[j];
        if (/^(check_item|check_item_ko|label|result|status|category|description|source|item|page|box)$/i.test(k)) continue;
        var cv = String(row[k] || "").trim();
        if (cv && cv !== "-" && cv !== "null" && cv !== "undefined") return cv;
      }
      return "";
    }

    // 3-1. 수입자 (개설의뢰인 / 수하인)
    var applicant = docKeys.applicant || docKeys.applicant_name || "";
    var buyerRow = matrix.find(function (x) {
      var key = String(x.check_item || x.item || "").toLowerCase();
      var ko = String(x.check_item_ko || x.label || "");
      return key.indexOf("buyer") >= 0 || key.indexOf("applicant") >= 0 ||
             ko.indexOf("수입자") >= 0 || ko.indexOf("수하인") >= 0 || ko.indexOf("개설의뢰인") >= 0;
    });
    if (buyerRow) {
      var bVal = getPartyValue(buyerRow);
      if (bVal) applicant = bVal;
    }
    applicant = (applicant && applicant !== "-") ? String(applicant).trim() : "-";

    // 3-2. 수출자 (수익자 / 송하인)
    var beneficiary = docKeys.beneficiary || docKeys.beneficiary_name || "";
    var sellerRow = matrix.find(function (x) {
      var key = String(x.check_item || x.item || "").toLowerCase();
      var ko = String(x.check_item_ko || x.label || "");
      return key.indexOf("seller") >= 0 || key.indexOf("beneficiary") >= 0 ||
             ko.indexOf("수출자") >= 0 || ko.indexOf("송하인") >= 0 || ko.indexOf("수익자") >= 0;
    });
    if (sellerRow) {
      var sVal = getPartyValue(sellerRow);
      if (sVal) beneficiary = sVal;
    }
    beneficiary = (beneficiary && beneficiary !== "-") ? String(beneficiary).trim() : "-";

    // 4. 불일치 및 주의(Warning/Review/Mismatch/주의) 정밀 판정
    var mismatchCount = 0;
    matrix.forEach(function (r) {
      var res = String(r.result || r.verdict || r.status || "").toLowerCase().trim();
      var isMismatch = res === "mismatch" || res === "fail" || res === "warning" || res === "warn" ||
                       res === "review_required" || res === "unclear" ||
                       res.indexOf("불일치") >= 0 || res.indexOf("주의") >= 0 || res.indexOf("검토") >= 0 || res.indexOf("오류") >= 0;
      if (isMismatch) {
        mismatchCount++;
      }
    });

    // 전체 요약 상태가 review_required/on_hold/보류/주의인 경우 최소 1건 이상 보장
    var overallStatusRaw = String(normPayload.overall_status || normPayload.overall_alert_level || "").toLowerCase();
    if ((overallStatusRaw === "review_required" || overallStatusRaw === "on_hold" ||
         overallStatusRaw === "warning" || overallStatusRaw === "warn" ||
         overallStatusRaw.indexOf("보류") >= 0 || overallStatusRaw.indexOf("주의") >= 0 || overallStatusRaw.indexOf("검토") >= 0) && mismatchCount === 0) {
      mismatchCount = 1;
    }

    var status = mismatchCount === 0 ? "MATCH" : "MISMATCH";
    var bucket = (CONFIG.supabase && CONFIG.supabase.storageBucket) || "ocr-pdfs";

    if (!pdfUrl && storagePath) {
      var pub = supabaseClient.storage.from(bucket).getPublicUrl(storagePath);
      pdfUrl = pub && pub.data ? pub.data.publicUrl : "";
    }

    var ocrRel = calculateOcrReliability(parsed, finalJob);

    var jId = (finalJob && finalJob.id) || currentJobId || "";
    var durSec = (finalJob && typeof finalJob._duration_seconds === "number") ? finalJob._duration_seconds : 0;
    var durMs = (finalJob && typeof finalJob._duration_ms === "number") ? finalJob._duration_ms : Math.round(durSec * 1000);
    var tokens = (finalJob && finalJob.usage && finalJob.usage.total_tokens) || null;

    var insertData = {
      file_name: file.name,
      storage_path: storagePath || ("pdfs/" + Date.now() + ".pdf"),
      pdf_url: pdfUrl || "",
      file_size: file.size || 0,
      total_pages: (docViewerState && docViewerState.totalPages) || 1,
      lc_no: lcNo,
      applicant: applicant,
      beneficiary: beneficiary,
      status: status,
      mismatch_count: mismatchCount,
      api_info: {
        job_id: jId,
        duration_seconds: durSec,
        processing_time_ms: durMs,
        ocr_confidence: ocrRel.score,
        reliability_grade: ocrRel.grade,
        ocr_status: ocrRel.statusText,
        model: finalJob.model || (CONFIG && CONFIG.agentId) || "agt_hYy33EbPU93zggAb6W9z3G",
        config_id: configId || (CONFIG && CONFIG.configId) || "17",
        total_tokens: tokens
      },
      result_json: finalJob
    };

    var res = await supabaseClient.from("ocr_history").insert([insertData]);
    if (!res.error) {
      var banner = document.getElementById("supabaseBanner");
      var bannerText = document.getElementById("supabaseBannerText");
      if (banner && bannerText) {
        banner.style.display = "flex";
        bannerText.innerHTML = `
          <i class="bi bi-cloud-check-fill" style="color: #10b981; font-size: 16px;"></i>
          <span><strong>[Supabase DB 저장 완료]</strong> 서류 점검 데이터가 안전하게 등록되었습니다. 
          (Job: <strong>${escapeHtml(jId ? (jId.slice(0, 14) + '...') : '-')}</strong> | 
           수행시간: <strong>${durSec > 0 ? (durSec + '초') : '-'}</strong> | 
           신뢰도: <strong>${ocrRel.score}% ${ocrRel.statusText}</strong> | 
           수입자: <strong>${escapeHtml(applicant)}</strong>)</span>
        `;
      }
      console.log("Saved to Supabase DB successfully!");
      // 콤보박스 최신 DB 목록 재동기화
      loadRecentDatasetsFromDb();
    } else {
      console.warn("Supabase DB Insert Error:", res.error);
    }
  } catch (err) {
    console.error("Save to Supabase failed:", err);
  }
}

function runWorkflow() {
  var apiKey = trimValue(els.apiKey.value);
  var configId = trimValue(els.configId.value);
  var selVal = els.sampleSelect ? els.sampleSelect.value : "";

  if (!apiKey) {
    alert("API Key를 입력하세요.");
    return;
  }

  if (!selectedFile) {
    if (selVal && selVal.startsWith("db:")) {
      var recId = selVal.replace("db:", "");
      loadInspectionFromDbById(recId);
      return;
    }
    alert("점검할 PDF 파일을 선택(업로드)하거나 DB 서류를 선택하세요.");
    return;
  }

  clearResult();
  currentCustomPdfUrl = null;
  els.runBtn.disabled = true;
  var currentSelectedFile = selectedFile;
  var supabasePublicUrl = null;
  var supabaseStoragePath = null;

  // Supabase Storage 비동기 업로드 개시 (안전한 ASCII Key 사용으로 Invalid key 방지)
  var storageUploadPromise = null;
  if (currentSelectedFile && supabaseClient) {
    try {
      var bucket = (CONFIG.supabase && CONFIG.supabase.storageBucket) || "ocr-pdfs";
      var fileExt = (currentSelectedFile.name.match(/\.[a-zA-Z0-9]+$/) || [".pdf"])[0].toLowerCase();
      var randomKey = Math.random().toString(36).substring(2, 10);
      var filePath = "pdfs/" + Date.now() + "_" + randomKey + fileExt;

      storageUploadPromise = supabaseClient.storage.from(bucket).upload(filePath, currentSelectedFile, {
        contentType: currentSelectedFile.type || "application/pdf",
        upsert: false
      }).then(function (upRes) {
        if (!upRes.error) {
          supabaseStoragePath = filePath;
          var pub = supabaseClient.storage.from(bucket).getPublicUrl(filePath);
          supabasePublicUrl = pub && pub.data ? pub.data.publicUrl : null;
          currentCustomPdfUrl = supabasePublicUrl;
          console.log("Supabase PDF uploaded successfully:", supabasePublicUrl);
          return { path: supabaseStoragePath, url: supabasePublicUrl };
        } else {
          console.warn("Supabase upload error:", upRes.error);
          return null;
        }
      }).catch(function (upErr) {
        console.warn("Supabase Storage catch upload error:", upErr);
        return null;
      });
    } catch (e) {
      console.warn("Supabase Storage init upload error:", e);
    }
  }

  var jobStartTime = Date.now();
  var fileSizeKb = selectedFile.size ? Math.round(selectedFile.size / 1024) : 0;
  setStatus("파일 업로드 중 (" + fileSizeKb + " KB)...", selectedFile.name || "");

  uploadFile(apiKey, selectedFile)
    .then(validateUploadedFile)
    .then(function (uploaded) {
      uploadedFileId = uploaded.id;

      els.fileInfo.innerHTML =
        "<strong>" + escapeHtml(selectedFile.name) + "</strong><br>" +
        '<span class="meta-text">file_id=' + escapeHtml(uploadedFileId) + "</span>";

      setStatus("Job 생성 중...", "file_id=" + uploadedFileId);
      return createJob(apiKey, uploadedFileId, configId);
    })
    .then(function (job) {
      currentJobId = job.id;
      if (els.lookupJobId) els.lookupJobId.value = currentJobId;
      setStatus("실행 중...", "job_id=" + currentJobId);
      return pollJob(apiKey, currentJobId);
    })
    .then(function (finalJob) {
      var durationMs = Date.now() - jobStartTime;
      var durationSec = Math.round((durationMs / 1000) * 10) / 10;
      finalJob._duration_ms = durationMs;
      finalJob._duration_seconds = durationSec;

      var rawText;
      var parsed;

      els.rawJson.textContent = JSON.stringify(finalJob, null, 2);

      if (finalJob.status === "failed") {
        setStatus("실행 실패", "job_id=" + currentJobId);
        alert("실행 실패: Raw JSON을 확인하세요.");
        els.runBtn.disabled = false;
        return;
      }

      rawText = extractResultText(finalJob);

      if (!rawText) {
        setStatus("완료되었지만 결과 텍스트 없음", "job_id=" + currentJobId);
        els.runBtn.disabled = false;
        return;
      }

      parsed = parseResultText(rawText);
      renderResult(parsed, finalJob);
      setStatus("완료", "job_id=" + currentJobId + " | 소요시간=" + durationSec + "s");
      els.runBtn.disabled = false;

      // Supabase DB 1행 자동 INSERT (사용자 핵심 요구사항 3단계)
      if (currentSelectedFile && supabaseClient) {
        if (storageUploadPromise) {
          storageUploadPromise.then(function (uploadResult) {
            var finalPath = (uploadResult && uploadResult.path) || supabaseStoragePath;
            var finalUrl = (uploadResult && uploadResult.url) || supabasePublicUrl;
            saveInspectionToSupabase(currentSelectedFile, finalPath, finalUrl, parsed, finalJob, configId);
          });
        } else {
          saveInspectionToSupabase(currentSelectedFile, supabaseStoragePath, supabasePublicUrl, parsed, finalJob, configId);
        }
      }
    })
    .catch(function (error) {
      console.error("Workflow Error:", error);
      setStatus("오류 발생", error.message);

      var errMsg = String(error.message || "");
      if (errMsg.indexOf("Failed to fetch") >= 0 || errMsg.indexOf("NetworkError") >= 0) {
        alert(
          "통신 연결에 실패했습니다.\n\n" +
          "• 모바일 Wi-Fi / LTE 데이터 연결 상태를 확인해 주세요.\n" +
          "• 상단의 [캐시 새로고침] 버튼을 눌러 최신 버전으로 갱신해 보세요.\n" +
          "• 프록시 Worker 주소 (" + (els.workerUrl ? els.workerUrl.value : "") + ")가 차단되었거나 지연 중일 수 있습니다."
        );
      } else if (errMsg.indexOf("No access to file") >= 0 || errMsg.indexOf("403") >= 0) {
        alert(
          "접근 권한 오류(403): 업로드된 파일 ID에 접근할 수 없거나 API 키 권한이 부족합니다."
        );
      } else {
        alert(error.message || "오류가 발생했습니다.");
      }

      els.runBtn.disabled = false;
    });
}

function fillSample(sampleIndex) {
  var idx = sampleIndex || 1;
  var fileName = "sample1.json";
  var sampleTitle = "실제샘플1";

  currentActiveSampleIndex = idx;
  selectedFile = null;

  if (els.sampleSelect) {
    els.sampleSelect.value = String(idx);
  }

  if (idx === 1) {
    fileName = "sample1.json";
    sampleTitle = "코오롱인더스트리 (실제샘플1)";
  } else if (idx === 2) {
    fileName = "sample2.json";
    sampleTitle = "현대로템 (실제샘플2)";
  } else if (idx === 3) {
    fileName = "sample3.json";
    sampleTitle = "가상Match샘플 (서류 정상 수용, PDF 6p)";
  } else if (idx === 4) {
    fileName = "sample4.json";
    sampleTitle = "가상MisMatch샘플 (양하항·수량 불일치, PDF 6p)";
  }

  if (els.fileInfo) {
    els.fileInfo.innerHTML = "<strong>[샘플선택] " + escapeHtml(sampleTitle) + "</strong> <span class=\"meta-text\">(" + escapeHtml(fileName) + ")</span>";
  }

  setStatus(sampleTitle + " 로딩 중...", fileName);

  fetch("./" + fileName + "?v=" + encodeURIComponent(getCacheBuster()), {
    cache: "no-store"
  })
    .then(function (res) {
      if (!res.ok) {
        throw new Error(fileName + " 로드 실패 (" + res.status + ")");
      }
      return res.json();
    })
    .then(function (sampleData) {
      var rawText = extractResultText(sampleData);
      var parsed = parseResultText(rawText);
      renderResult(parsed, sampleData);
      if (els.lookupJobId && sampleData.id) {
        els.lookupJobId.value = sampleData.id;
      }
      setStatus("샘플 결과 표시 중 (" + sampleTitle + ")", "job_id=" + (sampleData.id || fileName));

      // 뷰어가 열려 있는 경우 새 샘플의 PDF로 즉시 전환
      if (els.docViewerFloating && els.docViewerFloating.style.display !== "none") {
        openDocViewer(idx, 1, null, null);
      }
    })
    .catch(function (error) {
      console.error(error);
      setStatus(sampleTitle + " 로드 대기/실패", error.message);
      alert(error.message);
    });
}

function bindFileEvents() {
  els.dropzone.addEventListener("click", function () {
    els.fileInput.click();
  });

  els.fileInput.addEventListener("change", function (e) {
    selectedFile = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    if (els.sampleSelect && selectedFile) els.sampleSelect.value = "";
    els.fileInfo.textContent = selectedFile ? selectedFile.name : "선택된 파일 없음";
  });

  els.dropzone.addEventListener("dragover", function (e) {
    e.preventDefault();
    els.dropzone.classList.add("dragover");
  });

  els.dropzone.addEventListener("dragleave", function (e) {
    e.preventDefault();
    els.dropzone.classList.remove("dragover");
  });

  els.dropzone.addEventListener("drop", function (e) {
    e.preventDefault();
    els.dropzone.classList.remove("dragover");
    selectedFile = e.dataTransfer.files && e.dataTransfer.files[0] ? e.dataTransfer.files[0] : null;
    if (els.sampleSelect && selectedFile) els.sampleSelect.value = "";
    els.fileInfo.textContent = selectedFile ? selectedFile.name : "선택된 파일 없음";
  });
}

function setComparisonView(viewMode) {
  if (viewMode === "table") {
    if (els.viewTableBtn) els.viewTableBtn.classList.add("active");
    if (els.viewCardBtn) els.viewCardBtn.classList.remove("active");
    if (els.comparisonCardsContainer) els.comparisonCardsContainer.style.display = "none";
    if (els.comparisonTableWrap) {
      els.comparisonTableWrap.style.display = "block";
      els.comparisonTableWrap.classList.add("active-mobile-table");
    }
  } else {
    if (els.viewCardBtn) els.viewCardBtn.classList.add("active");
    if (els.viewTableBtn) els.viewTableBtn.classList.remove("active");
    if (els.comparisonCardsContainer) els.comparisonCardsContainer.style.display = "flex";
    if (els.comparisonTableWrap) {
      els.comparisonTableWrap.style.display = "none";
      els.comparisonTableWrap.classList.remove("active-mobile-table");
    }
  }
}

function initComparisonViewToggle() {
  if (!els.viewCardBtn || !els.viewTableBtn) return;

  els.viewCardBtn.addEventListener("click", function () {
    setComparisonView("card");
  });

  els.viewTableBtn.addEventListener("click", function () {
    setComparisonView("table");
  });

  var isMobile = window.innerWidth < 768;
  setComparisonView(isMobile ? "card" : "table");
}

function initTableColumnHover() {
  if (!els.comparisonTableWrap) return;

  els.comparisonTableWrap.addEventListener("mouseover", function (e) {
    var cell = e.target.closest("td, th");
    if (!cell || cell.getAttribute("colspan")) return;

    var index = cell.cellIndex + 1;
    var table = cell.closest("table");
    if (!table) return;

    var cells = table.querySelectorAll("tr > td:nth-child(" + index + "), tr > th:nth-child(" + index + ")");
    cells.forEach(function (c) {
      c.classList.add("col-hover");
    });
  });

  els.comparisonTableWrap.addEventListener("mouseout", function (e) {
    var cell = e.target.closest("td, th");
    if (!cell) return;

    var table = cell.closest("table");
    if (!table) return;

    var hovered = table.querySelectorAll(".col-hover");
    hovered.forEach(function (c) {
      c.classList.remove("col-hover");
    });
  });
}

function init() {
  initElements();
  initTheme();
  initComparisonViewToggle();
  initTableColumnHover();
  initDocViewerEvents();

  loadConfig()
    .then(function () {
      initSupabaseClient();
      bindFileEvents();
      loadRecentDatasetsFromDb();
      checkUrlParamAndLoadFromDb();
      if (els.forceRefreshBtn) {
        els.forceRefreshBtn.addEventListener("click", function () {
          if (confirm("모바일/브라우저 캐시를 완전히 비우고 최신 버전으로 새로고침하시겠습니까?")) {
            try {
              if (window.caches) {
                caches.keys().then(function (names) {
                  names.forEach(function (name) { caches.delete(name); });
                });
              }
              localStorage.removeItem("theme");
              sessionStorage.clear();
            } catch (e) {}
            var cleanUrl = window.location.origin + window.location.pathname + "?v=" + Date.now();
            window.location.replace(cleanUrl);
          }
        });
      }
      els.runBtn.addEventListener("click", runWorkflow);
      if (els.sampleBtn) els.sampleBtn.addEventListener("click", function () { fillSample(1); });
      if (els.sampleBtn1) els.sampleBtn1.addEventListener("click", function () { fillSample(1); });
      if (els.sampleBtn2) els.sampleBtn2.addEventListener("click", function () { fillSample(2); });
      if (els.sampleBtn3) els.sampleBtn3.addEventListener("click", function () { fillSample(3); });
      if (els.sampleBtn4) els.sampleBtn4.addEventListener("click", function () { fillSample(4); });
      if (els.sampleSelect) {
        els.sampleSelect.addEventListener("change", function (e) {
          var val = e.target.value;
          if (!val) return;
          if (val.startsWith("db:")) {
            var recId = val.replace("db:", "");
            loadInspectionFromDbById(recId);
          }
        });
      }
      els.clearBtn.addEventListener("click", clearAll);
      if (els.lookupBtn) els.lookupBtn.addEventListener("click", lookupExistingJob);
      if (els.copyJsonBtn) els.copyJsonBtn.addEventListener("click", copyJsonToClipboard);
      if (els.downloadJsonBtn) els.downloadJsonBtn.addEventListener("click", downloadJsonFile);
      clearResult();
      setStatus("대기 중", "cache_buster=v=" + getCacheBuster());
    })
    .catch(function (error) {
      console.error(error);
      alert("초기화 실패: " + error.message);
    });
}

/* ==========================================================================
   🌟 PDF Document Viewer & Interactive Highlighting Engine (Modeless Floating)
   ========================================================================== */

var SAMPLE_DOC_REGISTRY = {
  1: {
    name: "코오롱인더스트리",
    pdfPath: "./docs/sample1_kolon.pdf",
    totalPages: 12,
    sections: [
      { page: 1, label: "인수통지 (p.1)", title: "선적서류 인수통지 (KDB)" },
      { page: 2, label: "도착통지 (p.2)", title: "선적서류 도착통지 (KDB)" },
      { page: 3, label: "상업송장 (p.3)", title: "COMMERCIAL INVOICE (Domo)" },
      { page: 4, label: "패킹리스트 (p.4)", title: "PACKING LIST (Domo)" },
      { page: 5, label: "선하증권 (p.5)", title: "BILL OF LADING (Pelorus)" },
      { page: 6, label: "B/L첨부 (p.6)", title: "B/L ATTACHED STATEMENT" },
      { page: 7, label: "해상보험 (p.7)", title: "CERTIFICATE OF INSURANCE (CNA)" },
      { page: 9, label: "분석성적서 (p.9)", title: "CERTIFICATE OF ANALYSIS (Domo)" }
    ],
    docPages: {
      lc: 1,
      invoice: 3,
      commercial_invoice: 3,
      bl: 5,
      bill_of_lading: 5,
      packing_list: 4,
      insurance: 7,
      marine_cargo_insurance: 7,
      coo: 1,
      certificate_of_origin: 1,
      other_document: 1
    }
  },
  2: {
    name: "현대로템",
    pdfPath: "./docs/sample2_hyundai_rotem.pdf",
    totalPages: 10,
    sections: [
      { page: 1, label: "도착통지 (p.1)", title: "선적서류 도착통지 (KDB)" },
      { page: 2, label: "상업송장 (p.2)", title: "INVOICE (Mitsubishi Electric)" },
      { page: 3, label: "송장첨부 (p.3)", title: "INVOICE ATTACHED SHEET" },
      { page: 4, label: "패킹리스트 (p.4)", title: "PACKING LIST (Mitsubishi Electric)" },
      { page: 5, label: "패킹첨부 (p.5)", title: "PACKING LIST ATTACHED SHEET" },
      { page: 8, label: "선하증권 (p.8)", title: "BILL OF LADING (Naigai Nitto)" },
      { page: 9, label: "B/L첨부 (p.9)", title: "B/L ATTACHED SHEET" },
      { page: 10, label: "해상보험 (p.10)", title: "MARINE CARGO POLICY (Tokio Marine)" }
    ],
    docPages: {
      lc: 1,
      invoice: 2,
      commercial_invoice: 2,
      bl: 8,
      bill_of_lading: 8,
      packing_list: 4,
      insurance: 10,
      marine_cargo_insurance: 10,
      coo: 1,
      certificate_of_origin: 1,
      other_document: 1
    }
  },
  3: {
    name: "가상Match샘플",
    pdfPath: "./docs/sample3_match.pdf",
    totalPages: 6,
    sections: [
      { page: 1, label: "신용장 (p.1)", title: "SWIFT MT700 DOCUMENTARY CREDIT (신용장 L/C)" },
      { page: 2, label: "상업송장 (p.2)", title: "COMMERCIAL INVOICE (상업송장)" },
      { page: 3, label: "패킹리스트 (p.3)", title: "PACKING LIST (포장명세서)" },
      { page: 4, label: "선하증권 (p.4)", title: "BILL OF LADING (선하증권 B/L)" },
      { page: 5, label: "해상보험 (p.5)", title: "MARINE INSURANCE POLICY (해상적하보험증권)" },
      { page: 6, label: "원산지증명 (p.6)", title: "CERTIFICATE OF ORIGIN (원산지증명서)" }
    ],
    docPages: {
      lc: 1,
      invoice: 2,
      commercial_invoice: 2,
      packing_list: 3,
      bl: 4,
      bill_of_lading: 4,
      insurance: 5,
      marine_cargo_insurance: 5,
      coo: 6,
      certificate_of_origin: 6
    }
  },
  4: {
    name: "가상MisMatch샘플",
    pdfPath: "./docs/sample4_mismatch.pdf",
    totalPages: 6,
    sections: [
      { page: 1, label: "신용장 (p.1)", title: "SWIFT MT700 DOCUMENTARY CREDIT (신용장 L/C)" },
      { page: 2, label: "상업송장 (p.2)", title: "COMMERCIAL INVOICE (상업송장)" },
      { page: 3, label: "패킹리스트 (p.3)", title: "PACKING LIST (포장명세서)" },
      { page: 4, label: "선하증권 (p.4)", title: "BILL OF LADING (선하증권 B/L)" },
      { page: 5, label: "해상보험 (p.5)", title: "MARINE INSURANCE POLICY (해상적하보험증권)" },
      { page: 6, label: "원산지증명 (p.6)", title: "CERTIFICATE OF ORIGIN (원산지증명서)" }
    ],
    docPages: {
      lc: 1,
      invoice: 2,
      commercial_invoice: 2,
      packing_list: 3,
      bl: 4,
      bill_of_lading: 4,
      insurance: 5,
      marine_cargo_insurance: 5,
      coo: 6,
      certificate_of_origin: 6
    }
  }
};

var docViewerState = {
  sampleIdx: 1,
  pdfDoc: null,
  loadedPdfPath: null,
  currentPage: 1,
  totalPages: 1,
  zoom: 1.1,
  showHighlights: true,
  targetBox: null,
  targetLabel: "",
  loading: false,
  renderTask: null,
  isMaximized: false,
  // Floating Window Drag & Resize State
  isDragging: false,
  dragStartX: 0,
  dragStartY: 0,
  winStartLeft: 0,
  winStartTop: 0
};

/* Floating Window Draggable & Resizable Controller */
function initFloatingWindowControls() {
  var win = els.docViewerFloating;
  var header = els.docViewerHeader;
  if (!win || !header) return;

  // 1. Desktop Draggable by Header
  header.addEventListener("mousedown", function (e) {
    if (window.innerWidth <= 768 || docViewerState.isMaximized) return;
    // Don't drag if clicking buttons or inputs in header
    if (e.target.closest("button") || e.target.closest("input")) return;

    docViewerState.isDragging = true;
    docViewerState.dragStartX = e.clientX;
    docViewerState.dragStartY = e.clientY;

    var rect = win.getBoundingClientRect();
    docViewerState.winStartLeft = rect.left;
    docViewerState.winStartTop = rect.top;

    // Switch right positioning to left positioning for precise dragging
    win.style.right = "auto";
    win.style.bottom = "auto";
    win.style.left = rect.left + "px";
    win.style.top = rect.top + "px";

    document.body.style.userSelect = "none";
    e.preventDefault();
  });

  window.addEventListener("mousemove", function (e) {
    if (!docViewerState.isDragging || !win || window.innerWidth <= 768) return;

    var dx = e.clientX - docViewerState.dragStartX;
    var dy = e.clientY - docViewerState.dragStartY;

    var newLeft = docViewerState.winStartLeft + dx;
    var newTop = docViewerState.winStartTop + dy;

    // Boundaries
    var maxLeft = window.innerWidth - 100;
    var maxTop = window.innerHeight - 80;
    if (newLeft < 10) newLeft = 10;
    if (newLeft > maxLeft) newLeft = maxLeft;
    if (newTop < 10) newTop = 10;
    if (newTop > maxTop) newTop = maxTop;

    win.style.left = newLeft + "px";
    win.style.top = newTop + "px";
  });

  window.addEventListener("mouseup", function () {
    if (docViewerState.isDragging) {
      docViewerState.isDragging = false;
      document.body.style.userSelect = "";
    }
  });

  // 2. Mobile Swipe Down to Close Gesture
  var touchStartY = 0;
  var touchCurrentY = 0;
  var swipeTargets = [header, els.mobileSwipeHandleBar].filter(Boolean);

  swipeTargets.forEach(function (targetEl) {
    targetEl.addEventListener("touchstart", function (e) {
      if (window.innerWidth > 768) return;
      if (e.target.closest("button") || e.target.closest("input")) return;
      touchStartY = e.touches[0].clientY;
      touchCurrentY = touchStartY;
    }, { passive: true });

    targetEl.addEventListener("touchmove", function (e) {
      if (window.innerWidth > 768) return;
      touchCurrentY = e.touches[0].clientY;
      var diffY = touchCurrentY - touchStartY;
      if (diffY > 10 && win) {
        win.style.transform = "translateY(" + Math.min(diffY, 150) + "px)";
        win.style.transition = "none";
      }
    }, { passive: true });

    targetEl.addEventListener("touchend", function () {
      if (window.innerWidth > 768) return;
      var diffY = touchCurrentY - touchStartY;
      if (win) {
        win.style.transform = "";
        win.style.transition = "";
      }
      if (diffY > 70) {
        closeDocViewer();
      }
      touchStartY = 0;
      touchCurrentY = 0;
    }, { passive: true });
  });

  // 3. Window Control Buttons
  if (els.viewerDockBtn) {
    els.viewerDockBtn.addEventListener("click", resetFloatingDockPosition);
  }

  if (els.viewerMaxBtn) {
    els.viewerMaxBtn.addEventListener("click", toggleFloatingMaximize);
  }
}

function resetFloatingDockPosition() {
  var win = els.docViewerFloating;
  if (!win) return;
  win.classList.remove("maximized");
  docViewerState.isMaximized = false;
  if (els.viewerMaxBtn) {
    els.viewerMaxBtn.innerHTML = '<i class="bi bi-arrows-fullscreen"></i>';
    els.viewerMaxBtn.title = "최대화";
  }

  if (window.innerWidth <= 768) {
    win.style.left = "";
    win.style.top = "";
    win.style.right = "";
    win.style.bottom = "";
    win.style.width = "";
    win.style.height = "";
    return;
  }

  win.style.left = "auto";
  win.style.bottom = "auto";
  win.style.top = "70px";
  win.style.right = "24px";
  win.style.width = "740px";
  win.style.height = "calc(100vh - 95px)";
}

function toggleFloatingMaximize() {
  var win = els.docViewerFloating;
  if (!win) return;

  if (window.innerWidth <= 768) return; // 모바일은 이미 풀스크린

  docViewerState.isMaximized = !docViewerState.isMaximized;
  if (docViewerState.isMaximized) {
    win.classList.add("maximized");
    if (els.viewerMaxBtn) {
      els.viewerMaxBtn.innerHTML = '<i class="bi bi-fullscreen-exit"></i>';
      els.viewerMaxBtn.title = "이전 크기로 복원";
    }
  } else {
    resetFloatingDockPosition();
  }
  renderViewerPage(docViewerState.currentPage);
}

function fitViewerToWidth() {
  if (!docViewerState.pdfDoc) return;
  docViewerState.pdfDoc.getPage(docViewerState.currentPage).then(function (page) {
    var vp1 = page.getViewport({ scale: 1.0 });
    var bodyWidth = (els.docViewerBody && els.docViewerBody.clientWidth) ? els.docViewerBody.clientWidth : (window.innerWidth - 24);
    var targetWidth = bodyWidth - (window.innerWidth <= 768 ? 16 : 36);
    if (targetWidth > 50 && vp1.width > 0) {
      var calcScale = Math.min(2.5, Math.max(0.4, targetWidth / vp1.width));
      setViewerZoom(calcScale);
    } else {
      setViewerZoom(1.0);
    }
  }).catch(function () {
    setViewerZoom(1.0);
  });
}

function initDocViewerEvents() {
  initFloatingWindowControls();

  if (els.openDocViewerBtn) {
    els.openDocViewerBtn.addEventListener("click", function () {
      openDocViewer(currentActiveSampleIndex || 1);
    });
  }

  // Multiple Close Triggers
  if (els.viewerCloseBtn) {
    els.viewerCloseBtn.addEventListener("click", function () {
      closeDocViewer();
    });
  }

  if (els.viewerMobileCloseBtn) {
    els.viewerMobileCloseBtn.addEventListener("click", function () {
      closeDocViewer();
    });
  }

  if (els.docViewerBackdrop) {
    els.docViewerBackdrop.addEventListener("click", function () {
      closeDocViewer();
    });
  }

  // Android Hardware/Gesture Back Button Integration (popstate)
  window.addEventListener("popstate", function () {
    if (els.docViewerFloating && els.docViewerFloating.style.display !== "none") {
      closeDocViewer(true);
    }
  });

  if (els.viewerPrevPageBtn) {
    els.viewerPrevPageBtn.addEventListener("click", function () {
      if (docViewerState.currentPage > 1) {
        renderViewerPage(docViewerState.currentPage - 1);
      }
    });
  }

  if (els.viewerNextPageBtn) {
    els.viewerNextPageBtn.addEventListener("click", function () {
      if (docViewerState.currentPage < docViewerState.totalPages) {
        renderViewerPage(docViewerState.currentPage + 1);
      }
    });
  }

  if (els.viewerPageInput) {
    els.viewerPageInput.addEventListener("change", function (e) {
      var p = parseInt(e.target.value, 10);
      if (p >= 1 && p <= docViewerState.totalPages) {
        renderViewerPage(p);
      } else {
        e.target.value = docViewerState.currentPage;
      }
    });
  }

  if (els.viewerZoomInBtn) {
    els.viewerZoomInBtn.addEventListener("click", function () {
      setViewerZoom(docViewerState.zoom + 0.2);
    });
  }

  if (els.viewerZoomOutBtn) {
    els.viewerZoomOutBtn.addEventListener("click", function () {
      setViewerZoom(Math.max(0.4, docViewerState.zoom - 0.2));
    });
  }

  if (els.viewerFitWidthBtn) {
    els.viewerFitWidthBtn.addEventListener("click", function () {
      fitViewerToWidth();
    });
  }

  if (els.viewerToggleHighlightBtn) {
    els.viewerToggleHighlightBtn.addEventListener("click", function () {
      docViewerState.showHighlights = !docViewerState.showHighlights;
      if (docViewerState.showHighlights) {
        this.classList.remove("off");
        this.classList.add("btn-highlight-active");
        this.innerHTML = '<i class="bi bi-bounding-box"></i> <span>하이라이트 ON</span>';
      } else {
        this.classList.remove("btn-highlight-active");
        this.classList.add("off");
        this.innerHTML = '<i class="bi bi-bounding-box-circles"></i> <span>하이라이트 OFF</span>';
      }
      renderHighlightLayer(docViewerState.currentPage);
    });
  }

  // Keyboard Navigation: ESC to close, Left/Right or PageUp/PageDown to navigate
  document.addEventListener("keydown", function (e) {
    if (!els.docViewerFloating || els.docViewerFloating.style.display === "none") return;

    if (e.key === "Escape") {
      closeDocViewer();
    } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
      if (docViewerState.currentPage > 1) {
        renderViewerPage(docViewerState.currentPage - 1);
      }
    } else if (e.key === "ArrowRight" || e.key === "PageDown") {
      if (docViewerState.currentPage < docViewerState.totalPages) {
        renderViewerPage(docViewerState.currentPage + 1);
      }
    }
  });

  // Window resize handler: adapt viewer size between mobile and desktop
  window.addEventListener("resize", function () {
    if (!els.docViewerFloating || els.docViewerFloating.style.display === "none") {
      if (els.docViewerBackdrop) {
        els.docViewerBackdrop.classList.remove("active");
        els.docViewerBackdrop.style.display = "none";
      }
      return;
    }
    if (window.innerWidth <= 768) {
      els.docViewerFloating.style.left = "";
      els.docViewerFloating.style.top = "";
      els.docViewerFloating.style.right = "";
      els.docViewerFloating.style.bottom = "";
      els.docViewerFloating.style.width = "";
      els.docViewerFloating.style.height = "";
      if (els.docViewerBackdrop) {
        els.docViewerBackdrop.classList.add("active");
        els.docViewerBackdrop.style.display = "block";
      }
    } else {
      if (els.docViewerBackdrop) {
        els.docViewerBackdrop.classList.remove("active");
        els.docViewerBackdrop.style.display = "none";
      }
    }
  });
}

function setViewerZoom(newZoom) {
  docViewerState.zoom = Math.round(newZoom * 10) / 10;
  if (els.viewerZoomLabel) {
    els.viewerZoomLabel.textContent = Math.round(docViewerState.zoom * 100) + "%";
  }
  renderViewerPage(docViewerState.currentPage, docViewerState.targetBox, docViewerState.targetLabel);
}

function openDocViewer(sampleIdx, targetPage, targetBox, targetLabel) {
  var sIdx = sampleIdx || currentActiveSampleIndex || 1;
  var reg = SAMPLE_DOC_REGISTRY[sIdx] || SAMPLE_DOC_REGISTRY[1];

  var pdfSource = null;
  var docDisplayName = reg.name;
  var sourceKey = "";

  // 0) Supabase DB 저장 이력이나 공개 Storage URL이 있는 경우
  if (currentCustomPdfUrl) {
    pdfSource = currentCustomPdfUrl;
    docDisplayName = docViewerState.currentDocName || "저장 서류 PDF";
    sourceKey = currentCustomPdfUrl;
  } else if (selectedFile && selectedFile instanceof Blob) {
    // 1) 사용자가 직접 업로드한 로컬 파일이 있는 경우 (GitHub/서버 업로드 없이 브라우저 메모리 Blob URL로 즉시 로드)
    if (!docViewerState.uploadedBlobUrl || docViewerState.loadedFileRef !== selectedFile) {
      if (docViewerState.uploadedBlobUrl) {
        try { URL.revokeObjectURL(docViewerState.uploadedBlobUrl); } catch (e) {}
      }
      docViewerState.uploadedBlobUrl = URL.createObjectURL(selectedFile);
      docViewerState.loadedFileRef = selectedFile;
    }
    pdfSource = docViewerState.uploadedBlobUrl;
    docDisplayName = selectedFile.name;
    sourceKey = "blob:" + selectedFile.name + "_" + selectedFile.size;
  } else {
    // 2) 샘플 데이터셋 모드
    docViewerState.sampleIdx = sIdx;
    pdfSource = reg.pdfPath;
    docDisplayName = reg.name;
    sourceKey = reg.pdfPath;
  }

  docViewerState.currentDocName = docDisplayName;

  var isMobile = window.innerWidth <= 768;

  // Open Window & Reset Mobile inline positioning
  if (els.docViewerFloating) {
    if (isMobile) {
      els.docViewerFloating.style.left = "";
      els.docViewerFloating.style.top = "";
      els.docViewerFloating.style.right = "";
      els.docViewerFloating.style.bottom = "";
      els.docViewerFloating.style.width = "";
      els.docViewerFloating.style.height = "";
    }
    els.docViewerFloating.style.display = "flex";
  }

  // Backdrop on mobile
  if (els.docViewerBackdrop) {
    if (isMobile) {
      els.docViewerBackdrop.classList.add("active");
      els.docViewerBackdrop.style.display = "block";
    } else {
      els.docViewerBackdrop.classList.remove("active");
      els.docViewerBackdrop.style.display = "none";
    }
  }

  // Android back button integration
  if (isMobile) {
    if (!window.history.state || !window.history.state.modalDocViewer) {
      try {
        window.history.pushState({ modalDocViewer: true }, "");
      } catch (e) {}
    }
  }

  // Setup Quick Nav Tabs
  renderQuickNavTabs(sIdx);

  var pageToOpen = targetPage || 1;
  docViewerState.targetBox = targetBox || null;
  docViewerState.targetLabel = toKoreanLabel(targetLabel || "");

  // Set PDF.js Worker
  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }

  // Load PDF if not loaded or if document changed
  if (!docViewerState.pdfDoc || docViewerState.loadedPdfPath !== sourceKey) {
    if (els.viewerLoadingSpinner) els.viewerLoadingSpinner.style.display = "flex";
    
    if (window.pdfjsLib) {
      window.pdfjsLib.getDocument(pdfSource).promise.then(function (pdf) {
        docViewerState.pdfDoc = pdf;
        docViewerState.loadedPdfPath = sourceKey;
        docViewerState.totalPages = pdf.numPages || reg.totalPages || 1;

        if (isMobile) {
          fitViewerToWidth();
        } else {
          renderViewerPage(pageToOpen, targetBox, targetLabel);
        }
      }).catch(function (err) {
        console.error("PDF 로드 실패:", err);
        if (els.viewerLoadingSpinner) els.viewerLoadingSpinner.style.display = "none";
        alert("PDF 서류 로드에 실패했습니다. (" + docDisplayName + ")\n" + err.message);
      });
    } else {
      alert("PDF.js 라이브러리가 로드되지 않았습니다. 네트워크 연결을 확인하세요.");
    }
  } else {
    if (isMobile && !targetBox) {
      fitViewerToWidth();
    } else {
      renderViewerPage(pageToOpen, targetBox, targetLabel);
    }
  }
}

function closeDocViewer(fromPopstate) {
  if (els.docViewerFloating) {
    els.docViewerFloating.style.display = "none";
  }
  if (els.docViewerBackdrop) {
    els.docViewerBackdrop.classList.remove("active");
    els.docViewerBackdrop.style.display = "none";
  }

  // Revert history state if closed by button/gesture instead of popstate
  if (!fromPopstate && window.history.state && window.history.state.modalDocViewer) {
    try {
      window.history.back();
    } catch (e) {}
  }
}

function renderQuickNavTabs(sampleIdx) {
  if (!els.docQuickNav) return;
  var sIdx = sampleIdx || currentActiveSampleIndex || 1;
  var reg = SAMPLE_DOC_REGISTRY[sIdx] || SAMPLE_DOC_REGISTRY[1];
  var sections = reg.sections || [];

  // 사용자 업로드 파일인 경우 기본 페이지 섹션 자동 생성
  if (selectedFile && docViewerState.totalPages > 1 && sections.length === 0) {
    sections = [];
    for (var i = 1; i <= docViewerState.totalPages; i++) {
      sections.push({ page: i, label: "p." + i, title: selectedFile.name + " (" + i + "p)" });
    }
  }

  var html = "";
  sections.forEach(function (sec) {
    html += '<button type="button" class="quick-doc-btn" data-page="' + sec.page + '" title="' + escapeHtml(sec.title) + '">';
    html += '<i class="bi bi-file-earmark-text"></i> ' + escapeHtml(sec.label);
    html += '</button>';
  });

  els.docQuickNav.innerHTML = html;

  var btns = els.docQuickNav.querySelectorAll(".quick-doc-btn");
  btns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var p = parseInt(this.getAttribute("data-page"), 10);
      docViewerState.targetBox = null;
      docViewerState.targetLabel = "";
      renderViewerPage(p);
    });
  });
}

function renderViewerPage(pageNum, targetBox, targetLabel) {
  if (!docViewerState.pdfDoc) return;
  if (pageNum < 1) pageNum = 1;
  if (pageNum > docViewerState.totalPages) pageNum = docViewerState.totalPages;

  docViewerState.currentPage = pageNum;
  if (targetBox !== undefined) docViewerState.targetBox = targetBox;
  if (targetLabel !== undefined) docViewerState.targetLabel = targetLabel;

  if (els.viewerPageInput) els.viewerPageInput.value = pageNum;
  if (els.viewerTotalPages) els.viewerTotalPages.textContent = docViewerState.totalPages;
  if (els.viewerPageIndicator) els.viewerPageIndicator.textContent = "Page " + pageNum + " / " + docViewerState.totalPages;

  var reg = SAMPLE_DOC_REGISTRY[docViewerState.sampleIdx] || SAMPLE_DOC_REGISTRY[1];

  var currentSec = null;
  if (reg.sections) {
    for (var i = 0; i < reg.sections.length; i++) {
      if (reg.sections[i].page === pageNum) {
        currentSec = reg.sections[i];
        break;
      }
    }
  }

  if (els.viewerDocBadge) {
    els.viewerDocBadge.innerHTML = '<i class="bi bi-file-earmark-pdf-fill"></i> ' + escapeHtml(docViewerState.currentDocName || reg.name);
  }
  if (els.viewerDocTitle) {
    els.viewerDocTitle.textContent = currentSec ? currentSec.title : ("서류 페이지 " + pageNum);
  }

  // 🌟 Quick Nav 활성 탭 표시 동기화
  if (els.docQuickNav) {
    var qBtns = els.docQuickNav.querySelectorAll(".quick-doc-btn");
    qBtns.forEach(function (b) {
      var p = parseInt(b.getAttribute("data-page"), 10);
      if (p === pageNum) b.classList.add("active");
      else b.classList.remove("active");
    });
  }

  // 타겟 하이라이트 배너 표시 제어
  if (docViewerState.targetBox && docViewerState.targetLabel) {
    if (els.viewerHighlightBanner) els.viewerHighlightBanner.style.display = "flex";
    if (els.viewerHighlightTargetText) els.viewerHighlightTargetText.textContent = "하이라이트: " + docViewerState.targetLabel;
  } else {
    if (els.viewerHighlightBanner) els.viewerHighlightBanner.style.display = "none";
  }

  if (els.viewerLoadingSpinner) els.viewerLoadingSpinner.style.display = "flex";

  if (docViewerState.renderTask) {
    try { docViewerState.renderTask.cancel(); } catch (e) {}
    docViewerState.renderTask = null;
  }

  docViewerState.pdfDoc.getPage(pageNum).then(function (page) {
    var scale = docViewerState.zoom || 1.1;
    var viewport = page.getViewport({ scale: scale });

    var canvas = els.pdfCanvas;
    var ctx = canvas.getContext("2d");
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    var renderContext = {
      canvasContext: ctx,
      viewport: viewport
    };

    docViewerState.renderTask = page.render(renderContext);

    docViewerState.renderTask.promise.then(function () {
      if (els.viewerLoadingSpinner) els.viewerLoadingSpinner.style.display = "none";
      renderHighlightLayer(pageNum);
    }).catch(function (err) {
      if (err && err.name === "RenderingCancelledException") return;
      console.error("PDF 렌더링 에러:", err);
      if (els.viewerLoadingSpinner) els.viewerLoadingSpinner.style.display = "none";
    });
  }).catch(function (err) {
    console.error("페이지 로드 실패:", err);
    if (els.viewerLoadingSpinner) els.viewerLoadingSpinner.style.display = "none";
  });
}

function renderHighlightLayer(pageNum) {
  if (!els.highlightLayer) return;
  els.highlightLayer.innerHTML = "";

  if (!docViewerState.showHighlights) return;

  var reg = SAMPLE_DOC_REGISTRY[docViewerState.sampleIdx] || SAMPLE_DOC_REGISTRY[1];
  var pageBoxes = [];
  var seenCoords = {};

  // 1. 오직 JSON 데이터(check_results)에서 현재 페이지(pageNum)에 해당하는 모든 BBox 동적 수집 (mock 배제)
  if (currentCheckResults && currentCheckResults.length > 0) {
    currentCheckResults.forEach(function (cr) {
      if (!cr || !cr.documents) return;
      Object.keys(cr.documents).forEach(function (docKey) {
        var docItem = cr.documents[docKey];
        if (!docItem) return;
        var normSrc = normalizeSource(docItem.source);
        if (normSrc && normSrc.page === pageNum && normSrc.boxes.length > 0) {
          normSrc.boxes.forEach(function (box) {
            if (!box) return;
            var coordKey = Math.round(box.x * 1000) + "_" + Math.round(box.y * 1000);
            if (!seenCoords[coordKey]) {
              seenCoords[coordKey] = true;
              var rawTitle = cr.check_item_ko || cr.label || cr.check_item || docItem.field_name || "";
              var koTitle = toKoreanLabel(rawTitle, docKey);
              var valSnippet = (docItem.value != null && String(docItem.value).trim() !== "")
                ? (": " + String(docItem.value).slice(0, 35))
                : "";
              var finalBoxLabel = koTitle + valSnippet;
              pageBoxes.push({
                label: finalBoxLabel,
                box: box,
                key: cr.check_item,
                docKey: docKey
              });
            }
          });
        }
      });
    });
  }

  // 2. 박스 면적 계산 및 면적 내림차순 정렬 (큰 박스가 배경에 먼저 렌더링되고, 작은 박스가 전면에 위치)
  pageBoxes.forEach(function (pb) {
    pb.area = (pb.box.width || 0) * (pb.box.height || 0);
  });
  pageBoxes.sort(function (a, b) {
    return b.area - a.area;
  });

  // 🌟 3. targetBox와 가장 일치하는 "단 1개의 베스트 박스" 인덱스 선별
  var bestTargetIdx = -1;
  var minDistance = 0.022; // 2.2% 이내로 엄격히 제한

  if (docViewerState.targetBox) {
    var tx = docViewerState.targetBox.x;
    var ty = docViewerState.targetBox.y;

    pageBoxes.forEach(function (pb, idx) {
      var bx = pb.box.x;
      var by = pb.box.y;
      var dist = Math.hypot(tx - bx, ty - by);
      if (dist < minDistance) {
        minDistance = dist;
        bestTargetIdx = idx;
      }
    });
  }

  var targetEl = null;

  // 4. 수집된 모든 박스 렌더링: 오직 bestTargetIdx 1개만 파란색(target-active), 나머지는 모두 노란색
  pageBoxes.forEach(function (pb, idx) {
    var b = pb.box;
    var isTarget = (idx === bestTargetIdx);
    var area = pb.area || ((b.width || 0) * (b.height || 0));
    var isLargeBox = area > 0.035; // 전체 페이지 면적의 3.5% 이상을 차지하는 대형 박스 (테이블 블록 등)

    var boxDiv = document.createElement("div");
    boxDiv.className = "highlight-box" +
      (isTarget ? " target-active" : "") +
      (isTarget && isLargeBox ? " large-target-active" : "");

    boxDiv.style.left = (b.x * 100) + "%";
    boxDiv.style.top = (b.y * 100) + "%";
    boxDiv.style.width = (b.width * 100) + "%";
    boxDiv.style.height = (b.height * 100) + "%";

    var baseZ = Math.max(10, Math.round(250 - Math.min(area, 1) * 200));
    boxDiv.style.zIndex = isTarget ? (isLargeBox ? baseZ : 255) : baseZ;

    var koBoxLabel = toKoreanLabel(pb.label);
    boxDiv.setAttribute("title", koBoxLabel);

    if (isTarget) {
      var l = document.createElement("span");
      l.className = "highlight-box-label";
      l.textContent = toKoreanLabel(docViewerState.targetLabel || pb.label);
      boxDiv.appendChild(l);
      targetEl = boxDiv;
    } else {
      // 기본 노란색 박스: 호버 시 노란색 라벨 표시
      boxDiv.addEventListener("mouseenter", function () {
        if (!boxDiv.classList.contains("target-active") && !boxDiv.querySelector(".highlight-box-label")) {
          var tag = document.createElement("span");
          tag.className = "highlight-box-label highlight-box-label-yellow";
          tag.textContent = toKoreanLabel(pb.label);
          boxDiv.appendChild(tag);
        }
      });
      boxDiv.addEventListener("mouseleave", function () {
        if (!boxDiv.classList.contains("target-active")) {
          var tag = boxDiv.querySelector(".highlight-box-label-yellow");
          if (tag) tag.remove();
        }
      });
    }

    // 박스 직접 클릭 시 파란색 타깃으로 전환
    boxDiv.addEventListener("click", function (e) {
      e.stopPropagation();
      docViewerState.targetBox = b;
      var koClickLabel = toKoreanLabel(pb.label);
      docViewerState.targetLabel = koClickLabel;
      renderHighlightLayer(pageNum);
      if (els.viewerHighlightBanner) els.viewerHighlightBanner.style.display = "flex";
      if (els.viewerHighlightTargetText) els.viewerHighlightTargetText.textContent = "하이라이트: " + koClickLabel;
    });

    els.highlightLayer.appendChild(boxDiv);
  });

  // 5. 만약 targetBox가 목록에 없는 임의 위치라면, 파란색 타깃으로 단독 1개 추가 렌더링
  if (docViewerState.targetBox && bestTargetIdx === -1) {
    var tb = docViewerState.targetBox;
    var tbArea = (tb.width || 0) * (tb.height || 0);
    var tbIsLarge = tbArea > 0.035;
    var customDiv = document.createElement("div");
    customDiv.className = "highlight-box target-active" + (tbIsLarge ? " large-target-active" : "");
    customDiv.style.left = (tb.x * 100) + "%";
    customDiv.style.top = (tb.y * 100) + "%";
    customDiv.style.width = (tb.width * 100) + "%";
    customDiv.style.height = (tb.height * 100) + "%";
    customDiv.style.zIndex = tbIsLarge ? 150 : 255;

    if (docViewerState.targetLabel) {
      var customTag = document.createElement("span");
      customTag.className = "highlight-box-label";
      customTag.textContent = toKoreanLabel(docViewerState.targetLabel);
      customDiv.appendChild(customTag);
    }

    els.highlightLayer.appendChild(customDiv);
    targetEl = customDiv;
  }

  // Smooth scroll to target
  if (targetEl && els.docViewerBody) {
    setTimeout(function () {
      targetEl.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    }, 120);
  }
}

/**
 * 정교한 서류 종류(docType)와 검토항목(checkItemKey) 복합 매핑 엔진
 */
function normalizeDocType(docType) {
  if (!docType) return "";
  var d = String(docType).toLowerCase();
  if (d === "commercial_invoice" || d === "inv" || d === "invoice") return "invoice";
  if (d === "bill_of_lading" || d === "bl") return "bl";
  if (d === "marine_cargo_insurance" || d === "ins" || d === "insurance") return "insurance";
  if (d === "certificate_of_origin" || d === "coo") return "coo";
  if (d === "packing" || d === "pack" || d === "pk" || d === "packing_list") return "packing_list";
  if (d === "lc" || d === "letter_of_credit") return "lc";
  if (d === "other_document" || d === "other" || d === "notice") return "other_document";
  return d;
}

function getDocTarget(sampleIdx, docType) {
  var sIdx = sampleIdx || currentActiveSampleIndex || 1;
  var reg = SAMPLE_DOC_REGISTRY[sIdx] || SAMPLE_DOC_REGISTRY[1];
  var normDoc = normalizeDocType(docType);
  var defaultPage = (normDoc && reg.docPages && reg.docPages[normDoc]) ? reg.docPages[normDoc] : 1;
  return {
    page: defaultPage,
    box: null,
    label: ""
  };
}

function openDocViewerWithField(fieldKey, specificDocType) {
  var sIdx = currentActiveSampleIndex || 1;
  var target = null;

  if (specificDocType) {
    var evDoc = getEvidence(fieldKey, specificDocType);
    if (evDoc) {
      target = getEvidenceTarget(sIdx, specificDocType, evDoc, fieldKey);
    }
  }

  // JSON check_results에서 해당 필드 키와 연관된 항목 탐색
  if (!target && currentCheckResults && currentCheckResults.length > 0) {
    for (var i = 0; i < currentCheckResults.length; i++) {
      var cr = currentCheckResults[i];
      if (!cr || !cr.documents) continue;
      if (cr.check_item === fieldKey || cr.check_item === (fieldKey + "_consistency") || cr.check_item.indexOf(fieldKey) >= 0) {
        var docs = Object.keys(cr.documents);
        for (var j = 0; j < docs.length; j++) {
          if (specificDocType && docs[j] !== specificDocType) continue;
          var dItem = cr.documents[docs[j]];
          if (dItem && dItem.source && dItem.source.page > 0 && Array.isArray(dItem.source.boxes) && dItem.source.boxes.length > 0) {
            target = {
              page: dItem.source.page,
              box: dItem.source.boxes[0],
              label: toKoreanLabel(cr.check_item_ko || cr.label || fieldKey, docs[j]) + (dItem.value ? ": " + dItem.value : "")
            };
            break;
          }
        }
      }
      if (target) break;
    }
  }

  if (target && target.page > 0) {
    openDocViewer(sIdx, target.page, target.box, target.label);
  } else {
    var def = getDocTarget(sIdx, specificDocType || null);
    openDocViewer(sIdx, def.page, null, toKoreanLabel(fieldKey, specificDocType));
  }
}

function openDocViewerWithCheckItem(checkItemKey, docType) {
  var sIdx = currentActiveSampleIndex || 1;
  var evidenceDoc = getEvidence(checkItemKey, docType);
  var target = getEvidenceTarget(sIdx, docType, evidenceDoc, checkItemKey);

  // 1. JSON source BBox를 통한 하이라이트 (100% JSON 파일 기반)
  if (target && target.page > 0) {
    openDocViewer(sIdx, target.page, target.box, toKoreanLabel(target.label, docType));
    return;
  }

  // 2. JSON에 BBox가 없는 경우 명확히 안내
  var hasVal = evidenceDoc && hasMeaningfulValue(evidenceDoc.value);
  var koItemName = toKoreanLabel(evidenceDoc && evidenceDoc.field_name ? evidenceDoc.field_name : checkItemKey, docType);
  if (hasVal) {
    alert("해당 항목(" + koItemName + ")은 서류 내 원문 위치 정보(BBox)가 제공되지 않았습니다.\n(값: " + evidenceDoc.value + ")");
  } else {
    alert("해당 서류에는 '" + koItemName + "' 관련 기재 내용이 없습니다.");
  }
}

function openDocViewerForDoc(docKey) {
  var sIdx = currentActiveSampleIndex || 1;
  var reg = SAMPLE_DOC_REGISTRY[sIdx] || SAMPLE_DOC_REGISTRY[1];
  var page = (reg.docPages && reg.docPages[docKey]) ? reg.docPages[docKey] : 1;
  openDocViewer(sIdx, page, null, null);
}

document.addEventListener("DOMContentLoaded", init);

