/*
최신 admin-manage.js에 아래를 추가하세요.

1) manageEls에 추가
editImageDropZone: document.getElementById('editImageDropZone'),

2) HTML에서 이미지 교체 input 아래에 추가
<div id="editImageDropZone" class="upload-dropzone" tabindex="0">
  <strong>새 이미지를 여기에 드래그하세요</strong>
  <span>또는 이 영역을 클릭해 파일을 선택하거나, 캡처 이미지를 붙여넣으세요</span>
</div>

3) 아래 함수들을 추가하고 마지막에 wireDropAndPaste(); 호출
- getImageFileFromClipboard
- getImageFileFromDrop
- wireDropAndPaste

4) editImageFile change 이벤트에서는
const file = manageEls.editImageFile.files?.[0];
await prepareIncomingReplacementFile(file);
를 호출
*/
