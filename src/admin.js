const FOLDER_ID = "1bqItZazJOb0YY_4Hd_E1AA-SfbfNYLWf"; // 画像保存先フォルダID

function checkLogin(loginId, loginPass) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("管理");
  const rows = sheet.getDataRange().getValues();
  const shop = rows.find(r => String(r[2]) === String(loginId) && String(r[28]) === String(loginPass));
  
  if (shop) {
    const tel = String(shop[6] || "").split('-');
    const tRaw = String(shop[7] || "").replace(/[:：]/g, ':').replace(/[〜~ー－-]/g, '~');
    const t = tRaw.split(/[:~]/); 
    return {
      success: true,
      shopData: {
        id: shop[2], name: shop[4], address: shop[5],
        tel1: tel[0]||"", tel2: tel[1]||"", tel3: tel[2]||"",
        h1: t[0]||"", m1: t[1]||"", h2: t[2]||"", m2: t[3]||"",
        holiday: shop[8], tagline: shop[9], comment: shop[10],
        img: shop[11], img2: shop[12], img3: shop[13],
        baikai: shop[23], kobutsu: shop[24],
        insta: shop[25], x: shop[26], line: shop[27],
        sv: [shop[16], shop[17], shop[18], shop[19], shop[20], shop[21], shop[22]]
      }
    };
  }
  return { success: false };
}

function submitApproval(payload) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const applySheet = ss.getSheetByName("申請内容");
    const folder = DriveApp.getFolderById(FOLDER_ID);
    const urls = ["", "", ""];
    
    [payload.img, payload.img2, payload.img3].forEach((u, i) => {
      const fileName = payload.id + "_img" + (i + 1);
      if (u && u.startsWith("data:image")) {
        const oldFiles = folder.getFilesByName(fileName);
        while (oldFiles.hasNext()) { oldFiles.next().setTrashed(true); }
        const b = Utilities.newBlob(Utilities.base64Decode(u.split(",")[1]), u.split(";")[0].split(":")[1], fileName);
        const f = folder.createFile(b).setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        urls[i] = "https://drive.google.com/uc?export=view&id=" + f.getId();
      } else {
        urls[i] = u || "";
      }
    });

    const row = [
      new Date(), "承認待ち", payload.id, true, payload.name, payload.address, 
      payload.tel1 + "-" + payload.tel2 + "-" + payload.tel3, 
      payload.h1 + ":" + payload.m1 + "~" + payload.h2 + ":" + payload.m2, 
      payload.holiday, payload.tagline, payload.comment, urls[0], urls[1], urls[2],
      true, true, payload.sv[0], payload.sv[1], payload.sv[2], payload.sv[3], payload.sv[4], payload.sv[5], payload.sv[6],
      payload.baikai, payload.kobutsu, payload.insta, payload.x, payload.line
    ];
    
    // 申請内容シートに行を追加
    applySheet.appendRow(row);
    
    // 【追加】追加したばかりの行の「コメント欄（K列 = index 11）」に確認用メモを入れる
    const lastRow = applySheet.getLastRow();
    const commentCell = applySheet.getRange(lastRow, 11);
    const plainText = String(payload.comment).replace(/<[^>]*>/g, '');
    commentCell.setNote("【内容確認用】\n" + plainText);

    return "success";
  } catch (e) { return "エラー: " + e.toString(); }
}

function approveRow() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const applySheet = ss.getSheetByName("申請内容");
  const mainSheet = ss.getSheetByName("管理");
  const activeRow = applySheet.getActiveCell().getRow();
  
  if (activeRow < 2) { Browser.msgBox("承認する行を選択してください"); return; }
  
  const infoValues = applySheet.getRange(activeRow, 1, 1, 28).getValues()[0];
  const targetId = String(infoValues[2]);
  
  const mainData = mainSheet.getDataRange().getValues();
  const rowIndex = mainData.findIndex(row => String(row[2]) === targetId) + 1;
  
  if (rowIndex > 0) {
    let pref = String(infoValues[5]); 
    let num = String(infoValues[24]); 
    if (num && num.trim() !== "" && !num.includes("第")) {
      infoValues[24] = pref + " 第" + num + "号";
    }

    const currentStatus = mainSheet.getRange(rowIndex, 4).getValue();
    const updateData = infoValues.slice(2, 28); 
    updateData[1] = currentStatus; 

    // 背景色のリセット
    mainSheet.getDataRange().setBackground(null);

    const targetRange = mainSheet.getRange(rowIndex, 3, 1, 26);
    const oldValues = mainSheet.getRange(rowIndex, 3, 1, 26).getValues()[0];
    const colors = [];
    const rowColors = [];

    updateData.forEach((newVal, i) => {
      // 店舗ID(0)と店舗名(2)は常に色付け、それ以外は変更があった場合のみ色付け
      if (i === 0 || i === 2 || String(newVal) !== String(oldValues[i])) {
        rowColors.push("#fff0f5"); // 桜色（薄ピンク）
      } else {
        rowColors.push(null);
      }
    });
    colors.push(rowColors);

    // 管理シートへ反映
    targetRange.setValues([updateData]);
    targetRange.setBackgrounds(colors);

    // 管理シートのコメント欄にもメモを継承
    const commentCell = mainSheet.getRange(rowIndex, 11);
    const plainText = String(updateData[8]).replace(/<[^>]*>/g, '');
    commentCell.clearNote();
    commentCell.setNote("【内容確認用】\n" + plainText);
    
    applySheet.deleteRow(activeRow);
    mainSheet.activate();

    Browser.msgBox("反映完了しました！\n桜色がついた箇所が今回の修正点です。");
  } else {
    Browser.msgBox("エラー: 管理タブに一致する店舗IDが見つかりません。");
  }
}