export const dataURLToBlob = (dataURL) => {
  const BASE64_MARKER = ';base64,';
  if (dataURL.indexOf(BASE64_MARKER) == -1) {
    var parts = dataURL.split(',');
    var contentType = parts[0].split(':')[1];
    var raw = decodeURIComponent(parts[1]);

    return new Blob([raw], { type: contentType });
  }

  var parts = dataURL.split(BASE64_MARKER);
  var contentType = parts[0].split(':')[1];
  var raw = window.atob(parts[1]);
  const rawLength = raw.length;

  const uInt8Array = new Uint8Array(rawLength);

  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }

  return new Blob([uInt8Array], { type: contentType });
};

export const distance = (x1, y1, x2, y2) => Math.sqrt(((x1 - x2) ** 2) + ((y1 - y2) ** 2));

// return index of closest vertex in tfArray
export const getClosestVertex = (x, y, keypointPositionArray) => {
  let closest = null;
  let closestValue = Number.POSITIVE_INFINITY;
  for (let i = 0; i < keypointPositionArray.length; i += 1) {
    if (keypointPositionArray[i].x !== null) {
      const dist = distance(x, y, keypointPositionArray[i].x, keypointPositionArray[i].y);
      if (dist < closestValue) {
        closest = i;
        closestValue = dist;
      }
    }
  }
  return closest;
};

export const imgLoaded = img => new Promise((resolve) => {
  img.onload = () => { resolve(); };
});
