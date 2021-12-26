/* global document */
(() => {
  const source = document.getElementsByClassName('prettyprint source linenums');
  let i = 0;
  let lineNumber = 0;
  let lineId;
  let lines;
  let totalLines;
  let anchorHash;

  if (source && source[0]) {
    anchorHash = document.location.hash.substring(1);
    lines = source[0].getElementsByTagName('li');
    totalLines = lines.length;

    for (; i < totalLines; i += 1) {
      lineNumber += 1;
      lineId = `line${lineNumber}`;
      lines[i].id = lineId;
      if (lineId === anchorHash) {
        lines[i].className += ' selected';
      }
    }
  }
})();
