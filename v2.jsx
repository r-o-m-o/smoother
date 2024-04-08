// 20221130
// ルート検索方式
// 距離を先に記録
// ソートを修正しほぼメニューコマンドの挙動に近くなった
// ショックなことに先頭パスがひっくり返るバグがある

(function () {
  var sel = app.activeDocument.selection;
  if (sel.length < 1) return;
  var paths = extractPathItems(sel);
  main(paths);
})();

function main(paths) {
  // パス１つなら即閉じる
  if (paths.length === 1) {
    paths[0].closed = true;
    smoothing(paths[0].pathPoints, 0);
    return;
  }

  // 組み合わせ配列作成
  for (var i = 0, combos = []; i < paths.length; i++) {
    var st = paths[i].pathPoints.length > 1;
    for (var j = i + 1; j < paths.length; j++) {
      if (j === i) continue;
      var nd = paths[j].pathPoints.length > 1;
      for (var k = 0; k < 4; k++) {
        if (!st && k > 1) break;
        if (!nd && k % 2 === 1) continue;
        var temp = {
          0: [i, k < 2],
          1: [j, k % 2 === 0],
        };
        temp.range = getRange(paths[i].pathPoints[temp[0][1] ? paths[i].pathPoints.length - 1 : 0], paths[j].pathPoints[temp[1][1] ? 0 : paths[j].pathPoints.length - 1]);
        combos.push(temp);
      }
    }
  }

  // 距離でソート
  combos.sort(function (a, b) {
    if (a.range < b.range) return -1;
    if (a.range > b.range) return 1;
    return 0;
  });

  // ルート初期化
  var route = [];
  if (combos[0][0][1] || combos[0][1][1]) {
    route = [combos[0][0], combos[0][1]];
  } else {
    route = [combos[0][1], combos[0][0]];
    route[0][1] = true;
    route[1][1] = true;
  }

  // ルート検索
  for (var i = 1; route.length < paths.length; i++) {
    if (i > combos.length - 1) break;
    var combo = combos[i];
    // 重複検索 1
    if (route[0][0] === combo[0][0] && route[route.length - 1][0] === combo[1][0]) continue;
    if (route[0][0] === combo[1][0] && route[route.length - 1][0] === combo[0][0]) continue;
    // 重複検索 2
    if (route.length > 2) {
      for (var j = 1, inv = true; j < route.length - 1; j++) {
        if (combo[0][0] === route[j][0] || combo[1][0] === route[j][0]) {
          inv = false;
          break;
        }
      }
      if (!inv) continue;
    }
    // ルート格納
    if (route[0][0] === combo[0][0] && route[0][1] === !combo[0][1]) {
      route.unshift(combo[1]);
      route[0][1] = !combo[1][1];
    } else if (route[0][0] === combo[1][0] && route[0][1] === combo[1][1]) {
      route.unshift(combo[0]);
    } else if (route[route.length - 1][0] === combo[0][0] && route[route.length - 1][1] === combo[0][1]) {
      route.push(combo[1]);
    } else if (route[route.length - 1][0] === combo[1][0] && route[route.length - 1][1] === !combo[1][1]) {
      route.push(combo[0]);
      route[route.length - 1][1] = !combo[0][1];
    }
  }

  if (route.length !== paths.length) return;

  // パス連結処理
  for (var i = 0; i < paths.length; i++) {
    if (!route[i][1]) normalize(paths[route[i][0]]);
    if (i === 0) continue;
    connecting(paths[route[i][0]], paths[route[0][0]]);
  }

  // 仕上げ処理
  paths[route[0][0]].closed = true;
  smoothing(paths[route[0][0]].pathPoints, 0);
  return;
}

// ポイントの順序を逆転
function normalize(path) {
  var points = path.pathPoints;
  for (var k = points.length - 1; k >= 0; k--) {
    var newPoint = points.add();
    newPoint.anchor = points[k].anchor;
    newPoint.leftDirection = points[k].rightDirection;
    newPoint.rightDirection = points[k].leftDirection;
    points[k].remove();
  }
  return path;
}

// 指定したパスの追加（aをbへ
function connecting(a, b) {
  var source = a.pathPoints;
  var destination = b.pathPoints;
  var boundary = destination.length;
  for (var i = 0; i < source.length; i++) {
    var newPoint = destination.add();
    newPoint.anchor = source[i].anchor;
    newPoint.leftDirection = source[i].leftDirection;
    newPoint.rightDirection = source[i].rightDirection;
  }
  smoothing(destination, boundary);
  a.remove();
}

// なめらかにする（ほぼ完璧
function smoothing(points, index) {
  var xedni = index === 0 ? points.length - 1 : index - 1;
  var current = points[index];
  var previous = points[xedni];
  var range = getRange(current, previous);
  // 2点間の距離が0なら1点にする
  if (toRound(range) === 0) {
    previous.rightDirection = current.rightDirection;
    current.remove();
    return;
  }
  // 両端がハンドルを持っているなら終了（とりあえず既存ハンドル無視
  // if(hasHandle(previous, 'right') && hasHandle(current, 'left')) return;
  // 現ポイントの角度
  if (hasHandle(current, "left")) {
    var caa = getAngle(current.anchor, current.leftDirection);
  } else if (hasHandle(current, "right")) {
    var caa = getAngle(current.rightDirection, current.anchor);
  } else {
    var next = points[index + 1];
    if (next === undefined) return;
    var caa = hasHandle(next, "left") ? getAngle(next.leftDirection, current.anchor) : getAngle(next.anchor, current.anchor);
  }
  // 前ポイントの角度
  if (hasHandle(previous, "right")) {
    var paa = getAngle(previous.anchor, previous.rightDirection);
  } else if (hasHandle(previous, "left")) {
    var paa = getAngle(previous.leftDirection, previous.anchor);
  } else {
    var before = points[xedni - 1];
    if (before === undefined) return;
    var paa = hasHandle(before, "right") ? getAngle(before.rightDirection, previous.anchor) : getAngle(before.anchor, previous.anchor);
  }
  // 各種計算
  var tilt = getAngle(current.anchor, previous.anchor);
  var cra = caa - tilt;
  var pra = paa - tilt;
  var apex = Math.abs(180 - Math.abs(pra - cra));
  var radius = range / Math.cos(toRad((180 - apex) / 2)) / 2; // 円弧に近似
  var handle = (4 / 3) * Math.tan(toRad(apex) / 4) * radius;
  current.leftDirection = getDirection(current, handle, 180 - caa);
  previous.rightDirection = getDirection(previous, handle, 180 - paa);
  return;
}

// ハンドル座標計算
function getDirection(point, range, angle) {
  return [point.anchor[0] + range * Math.cos(toRad(angle)), point.anchor[1] - range * Math.sin(toRad(angle))];
}

// ハンドルチェック
function hasHandle(point, horizontal) {
  var anchor = point.anchor;
  var handle = point[horizontal + "Direction"];
  if (anchor[0] !== handle[0] || anchor[1] !== handle[1]) return true;
  return false;
}

// 距離を算出
function getRange(a, b) {
  return Math.abs(Math.sqrt(Math.pow(a.anchor[0] - b.anchor[0], 2) + Math.pow(a.anchor[1] - b.anchor[1], 2)));
}

// 角度を算出
function getAngle(a, b) {
  var radian = Math.atan2(a[1] - b[1], a[0] - b[0]);
  var degree = radian * (180 / Math.PI);
  return degree;
}

// ラジアンに変換
function toRad(degree) {
  return degree * (Math.PI / 180);
}

// 小数点以下第三位で四捨五入
function toRound(num) {
  return Math.round(num * 10000) / 10000;
}

// パスを抽出
function extractPathItems(arr, result) {
  if (result === undefined) result = [];
  for (var i = 0; i < arr.length; i++) {
    var type = arr[i].typename;
    if (type === "GroupItem") {
      extractPathItems(arr[i].pageItems, result);
    } else if (type === "PathItem" && arr[i].closed === false) {
      result.push(arr[i]);
    } else {
      arr[i].selected = false;
    }
  }
  return result;
}
