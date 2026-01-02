var SHEET_ID = "1WNBOBrurs7ECXO2UxsCxraS1y9KseTGO9d8e0TJalZ8";
var SHEET_WORDS_NAME = "Words";
var SHEET_VIDEOS_NAME = "Videos";
var DRIVE_FOLDER_ID = "1BhngAuFaFIYwFt54ETqLGNkqjdTeT_eG";
var DRIVE_WORDS_FOLDER_ID = "";
var DRIVE_SENTENCES_FOLDER_ID = "";

function doGet(e) {
  var action = e && e.parameter && e.parameter.action ? e.parameter.action : "";
  if (action === "streamVideo") {
    return handleStreamVideo(e);
  }
  var output = ContentService.createTextOutput("SignWord Apps Script is running.");
  output.setMimeType(ContentService.MimeType.TEXT);
  return output;
}

function doPost(e) {
  try {
    var bodyText = e.postData && e.postData.contents ? e.postData.contents : "";
    if (!bodyText) {
      return jsonResponse({ error: "empty body" }, 400);
    }
    var data = JSON.parse(bodyText);
    var action = data.action;
    var payload = data.payload || {};
    if (action === "createWord") {
      return handleCreateWord(payload);
    }
    if (action === "createVideo") {
      return handleCreateVideo(payload);
    }
    if (action === "uploadVideoFile") {
      return handleUploadVideoFile(payload);
    }
    return jsonResponse({ error: "unknown action" }, 400);
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500);
  }
}

function handleCreateWord(payload) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(SHEET_WORDS_NAME);
  if (!sheet) {
    return jsonResponse({ error: "Words sheet not found" }, 500);
  }
  var wordId = payload.wordId || "";
  var word = payload.word || "";
  var wordType = payload.wordType || "";
  var meaning = payload.meaning || "";
  var tags = payload.tags || "";
  var level = payload.level || "";
  var notes = payload.notes || "";
  var row = [wordId, word, wordType, meaning, tags, level, notes];
  sheet.appendRow(row);
  return jsonResponse({ ok: true });
}

function handleCreateVideo(payload) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(SHEET_VIDEOS_NAME);
  if (!sheet) {
    return jsonResponse({ error: "Videos sheet not found" }, 500);
  }
  var videoId = payload.videoId || "";
  var type = payload.type || "word";
  var wordId = payload.wordId || "";
  var sentenceText = payload.sentenceText || "";
  var videoUrl = payload.videoUrl || "";
  var description = payload.description || "";
  var signer = payload.signer || "";
  var tags = payload.tags || "";
  var createdAt = payload.createdAt || Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd HH:mm:ss");
  var row = [videoId, type, wordId, sentenceText, videoUrl, description, signer, tags, createdAt];
  sheet.appendRow(row);
  return jsonResponse({ ok: true });
}

function handleUploadVideoFile(payload) {
  if (!payload || !payload.content) {
    return jsonResponse({ error: "file content missing" }, 400);
  }
  var bytes = payload.content;
  var mimeType = payload.mimeType || "application/octet-stream";
  var originalName = payload.name || "video";
  var videoId = payload.videoId || "";
   var type = payload.type || "word";
  var dotIndex = originalName.lastIndexOf(".");
  var baseName = dotIndex > 0 ? originalName.substring(0, dotIndex) : originalName;
  var extension = dotIndex > 0 ? originalName.substring(dotIndex) : "";
  var name = videoId ? baseName + " " + videoId + extension : originalName;
  var folderId = DRIVE_FOLDER_ID;
  if (type === "sentence" && DRIVE_SENTENCES_FOLDER_ID) {
    folderId = DRIVE_SENTENCES_FOLDER_ID;
  } else if (type === "word" && DRIVE_WORDS_FOLDER_ID) {
    folderId = DRIVE_WORDS_FOLDER_ID;
  }
  var folder = DriveApp.getFolderById(folderId);
  var blob = Utilities.newBlob(bytes, mimeType, name);
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  var fileId = file.getId();
  var link = "https://drive.google.com/file/d/" + fileId + "/view?usp=sharing";
  var createdAt = Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd HH:mm:ss");
  return jsonResponse({
    videoUrl: link,
    fileId: fileId,
    createdAt: createdAt
  }); 
}

function handleStreamVideo(e) {
  var fileId = "";
  if (e && e.parameter) {
    if (e.parameter.fileId) {
      fileId = e.parameter.fileId;
    } else if (e.parameter.videoUrl) {
      var url = e.parameter.videoUrl;
      var marker = "/file/d/";
      if (url.indexOf(marker) !== -1) {
        var start = url.indexOf(marker) + marker.length;
        var after = url.substring(start);
        var slashIndex = after.indexOf("/");
        var questionIndex = after.indexOf("?");
        var endIndex = after.length;
        if (slashIndex !== -1 && questionIndex !== -1) {
          endIndex = Math.min(slashIndex, questionIndex);
        } else if (slashIndex !== -1) {
          endIndex = slashIndex;
        } else if (questionIndex !== -1) {
          endIndex = questionIndex;
        }
        fileId = after.substring(0, endIndex);
      }
    }
  }

  if (!fileId) {
    var errorOutput = ContentService.createTextOutput("missing fileId");
    errorOutput.setMimeType(ContentService.MimeType.TEXT);
    return errorOutput;
  }

  var file = DriveApp.getFileById(fileId);
  var blob = file.getBlob();
  var contentType = blob.getContentType() || "video/mp4";
  blob.setContentType(contentType);
  return blob;
}

function jsonResponse(obj, statusCode) {
  var rc = statusCode || 200;
  var output = ContentService.createTextOutput(JSON.stringify(obj));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
