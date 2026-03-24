// プロジェクト全体で一意にするため、ここでの FOLDER_ID 宣言は削除しました

function doGet(e) {
  const shopId = e.parameter.id;
  const mode = e.parameter.mode; 
  const scriptUrl = ScriptApp.getService().getUrl();

  if (mode === 'admin') {
    return HtmlService.createTemplateFromFile('admin_index').evaluate()
      .setTitle("SD CORE 管理画面")
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }

  if (shopId) {
    const data = getShopData(shopId);
    if (!data || data.status !== true) return HtmlService.createHtmlOutput("店舗データが見つかりません。");
    const template = HtmlService.createTemplateFromFile('template');
    template.data = data;
    template.scriptUrl = scriptUrl;
    return template.evaluate().setTitle(data.name).addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }

  const allData = getAllShopData();
  const template = HtmlService.createTemplateFromFile('list_template');
  template.data = allData;
  template.scriptUrl = scriptUrl;
  return template.evaluate().setTitle("SD CORE | 店舗一覧").addMetaTag('viewport', 'width=device-width, initial-scale=1').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getAllShopData() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("管理");
  const values = sheet.getDataRange().getValues();
  values.shift();
  const areaOrder = ["北海道", "東北", "関東", "中部", "関西", "中国", "四国", "九州", "沖縄"];
  const prefOrder = ["北海道","青森県","岩手県","宮城県","秋田県","山形県","福島県","茨城県","栃木県","群馬県","埼玉県","千葉県","東京都","神奈川県","新潟県","富山県","石川県","福井県","山梨県","長野県","岐阜県","静岡県","愛知県","三重県","滋賀県","京都府","大阪府","兵庫県","奈良県","和歌山県","鳥取県","島根県","岡山県","広島県","山口県","徳島県","香川県","愛媛県","高知県","福岡県","佐賀県","長崎県","熊本県","大分県","宮崎県","鹿児島県","沖縄県"];
  const groups = {};
  areaOrder.forEach(a => groups[a] = {});
  let totalCount = 0;
  values.forEach(row => {
    if (row[3] !== true) return;
    let sheetArea = String(row[0]);
    let pref = row[1];
    let matchedArea = areaOrder.find(a => sheetArea.includes(a));
    if (!matchedArea) return;
    if (!groups[matchedArea][pref]) groups[matchedArea][pref] = [];
    const svcNames = ["新規契約","乗り換え相談","Wi-Fi","修理保険","買取","修理","コーティング","スマートホーム","スマホ教室"];
    let svcs = [];
    svcNames.forEach((name, index) => { if (row[14 + index] === true) svcs.push(name); });
    groups[matchedArea][pref].push({
      id: row[2], name: row[4], img: formatDriveImageUrl(row[11]), address: row[5], services: svcs, sortNo: row[28]
    });
    totalCount++;
  });
  Object.keys(groups).forEach(a => {
    Object.keys(groups[a]).forEach(p => {
      groups[a][p].sort((x, y) => (Number(x.sortNo) || 999) - (Number(y.sortNo) || 999));
    });
  });
  return { groups, areaOrder, prefOrder, totalCount };
}

function getShopData(id) {
  const values = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("管理").getDataRange().getValues();
  values.shift();
  const row = values.find(r => String(r[2]) === String(id));
  if (!row) return null;
  const svcNames = ["新規契約","乗り換え相談","Wi-Fi","修理保険","買取","修理","コーティング","スマートホーム","スマホ教室"];
  let svcs = [];
  svcNames.forEach((name, index) => { if (row[14 + index] === true) svcs.push(name); });
  
  // X列(23)をbaikai_id、Y列(24)をlaw_idとして取得
  return {
    id: row[2], status: row[3], name: row[4], tagline: row[9], comment: row[10],
    imgs: [row[11], row[12], row[13]].map(url => formatDriveImageUrl(url)).filter(v => v !== ""),
    address: row[5], tel: row[6], hours: row[7], holiday: row[8], 
    baikai_id: row[23], 
    law_id: row[24],
    sns: { insta: row[25], x: row[26], line: row[27] }, services: svcs 
  };
}

function formatDriveImageUrl(url) {
  if (!url || typeof url !== 'string' || url === "") return "";
  const match = url.match(/[-\w]{25,}/);
  if (!match) return url;
  // 元の形式（http://googleusercontent.com...）に完全に戻しました
  return "https://lh3.googleusercontent.com/d/" + match[0];
}