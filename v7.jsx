// ルート構築見直し

(function () {
  var sel = app.activeDocument.selection;
  if (sel.length < 1) return;
  var targets = extractPathItems(sel);
  if (targets.length < 1) return;
  var result = main(targets);
  result.closed = true;
  smoothing(result.pathPoints, 0);
})();

function main(paths) {
  var pal = paths.length;
  // パス１つなら即終了
  if (pal === 1) return paths[0];

  // 組み合わせ配列作成
  for (var i = 0, combos = []; i < pal; i++) {
    for (var j = i + 1; j < pal; j++) {
      for (var k = 0; k < 4; k++) {
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

  // インデックスリスト（未処理リスト）
  var ida = (function (n) {
    for (var i = 0, l = []; i < n; i++) l.push(i);
    return l;
  })(pal);

  // かぶらないように組み合わせを抽出
  for (var i = 0, cols = []; i < combos.length || cols.length < Math.floor(pal / 2); i++) {
    var combo = combos[i]; // 現在地
    var former = combo[0][0]; // 前者のインデックス
    var latter = combo[1][0]; // 後者のインデックス

    // 未処理リストの中にあるか確認
    var cunc = (function () {
      for (var i = 0, r = []; i < ida.length; i++) {
        if (ida[i] === former || ida[i] === latter) r.push(i);
      }
      return r;
    })();

    // 未処理リストに２つなければスルー
    if (cunc.length < 2) continue;

    // 未処理リスト中のインデックスの最初が小さければ逆転
    if (cunc[0] < cunc[1]) cunc.reverse();

    // 未処理リストから削除
    ida.splice(cunc[0], 1);
    ida.splice(cunc[1], 1);

    // 後続の重複を削除（不要？
    for (var j = i + 1; j < combos.length; j++) {
      var comp = combos[j];
      if ((comp[0][0] === former && comp[1][0] === latter) || (comp[1][0] === former && comp[0][0] === latter)) {
        combos.splice(j, 1);
        j--;
      }
    }
    var col = combos.splice(i, 1)[0];
    var mue = [col[0], col[1]];
    cols.push(mue); // 記録して削除
    i--;
  }

  // ルート初期化
  var route = cols.shift();
  if (!route[0][1] && !route[1][1]) {
    route.reverse();
    route[0][1] = true;
    route[1][1] = true;
  }

  // 奇数フラグ
  var exc = pal % 2 > 0;

  // 未処理のインデックス
  var inco = ida.length > 0 ? ida[0] : -1;

  while (route.length < pal) {
    var start = route[0];
    var end = route[route.length - 1];
    for (var i = 0; i < combos.length; i++) {
      var combo = combos[i];
      var former = combo[0];
      var latter = combo[1];

      // 接続先の確認
      var matches = (function (a, b) {
        for (var i = 0, r = []; i < 2; i++) {
          for (var j = 0; j < 2; j++) {
            if (a[i][0] !== b[j][0]) continue;
            var idxm = i === j;
            var dirm = a[i][1] === b[j][1];
            if (idxm === dirm) continue;
            r.push([i, j]);
          }
        }
        return r;
      })([start, end], [former, latter]);

      // 重複を確認
      try {
        // 接続先が2個以上ならエラー
        if (matches.length > 1) throw new Error("Duplicate route encountered");
        // ルートの途中にあったらエラー
        if (route.length > 2) {
          for (var j = 1; j < route.length - 1; j++) {
            if (route[j][0] === former[0] || route[j][0] === latter[0]) {
              throw new Error("Duplicate route encountered");
            }
          }
        }
      } catch (e) {
        combos.splice(i, 1);
        i--;
        continue;
      }

      // 接続先が0個ならスルー
      if (matches.length < 1) continue;

      // 接続先の組み合わせ
      var match = matches[0];

      // 接続元
      var from = match[0] === 0 ? start : end;

      // 接続先
      var to = match[1] === 0 ? latter : former;

      // インデックスが同じなら逆転
      if (match[0] === match[1]) to[1] = !to[1];

      //　次の接続先
      var next = (function () {
        if (exc && to[0] === inco) return -1;
        for (var i = 0; i < cols.length; i++) {
          var col = cols[i];
          for (var j = 0; j < 2; j++) {
            if (to[0] !== col[j][0]) continue;
            var idxm = match[0] === j;
            var dirm = to[1] === col[j][1];
            if (idxm === dirm) continue;
            var target = cols.splice(i, 1)[0];
            return { t: target[j === 0 ? 1 : 0], d: idxm };
          }
        }
        return null;
      })();

      // 次がなければスルー
      if (next === null) continue;

      // ルート格納
      match[0] === 0 ? route.unshift(to) : route.push(to);

      combos.splice(i, 1);

      if (exc && next === -1) {
        exc = false;
      } else {
        if (next.d) next.t[1] = !next.t[1];
        match[0] === 0 ? route.unshift(next.t) : route.push(next.t);
      }

      break;
    }
  }

  // パス連結処理
  for (var i = 0; i < pal; i++) {
    if (!route[i][1]) normalize(paths[route[i][0]]);
    if (i === 0) continue;
    connecting(paths[route[i][0]], paths[route[0][0]]);
  }

  // 返す
  return paths[route[0][0]];
}

function matchCheck(arr) {
  for (var i = 0, result = []; i < arr.length; i++) {
    for (var j = i + 1; j < arr.length; j++) {
      if (arr[i][0] !== arr[j][0]) continue;
      result.push([arr[i], arr[j]]);
      break;
    }
  }
  return result;
}

function objectKiller(arr) {
  var result = [];
  for (var i = 0; i < arr.length; i++) {
    var obj = arr[i];
    // 0と1のキーの値を新しい配列に追加
    result.push([obj[0], obj[1]]);
  }
  return result;
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
  if (source.length > 1) smoothing(destination, boundary);
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
    } else if (type === "PathItem" && arr[i].closed === false && arr[i].pathPoints.length > 1) {
      result.push(arr[i]);
    } else {
      arr[i].selected = false;
    }
  }
  return result;
}
