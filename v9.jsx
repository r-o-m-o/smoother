// 幽霊ハンドルは徹底無視

(function () {
  // 選択アイテム
  var sel = app.activeDocument.selection;
  if (sel.length < 1) return;
  // パスの配列
  var paths = extractPathItems(sel);
  if (paths.length < 1) return;
  // 接続結果
  var result = main(paths);
  // 最終処理
  result.closed = true;
  smoothing(result.pathPoints, 0);
})();

function main(paths) {
  // パス長
  var pal = paths.length;

  // パス１つならそれを返して終了
  if (pal === 1) return paths.shift();

  // 全組み合わせ配列作成
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

  // ルート初期化
  var origin = combos.shift();
  var route = [origin[0], origin[1]];
  // どちらも向きがfalseなら逆転
  if (!route[0][1] && !route[1][1]) {
    route.reverse();
    route[0][1] = true;
    route[1][1] = true;
  }

  // ルート構築（パス長になるまで続ける
  while (route.length < pal) {
    var start = route[0]; // 始点
    var end = route[route.length - 1]; // 終点
    for (var i = 0; i < combos.length; i++) {
      var combo = combos[i];
      var former = combo[0]; // 前者
      var latter = combo[1]; // 後者

      // 接続先を配列化
      var matches = (function (a, b) {
        for (var i = 0, r = []; i < 2; i++) {
          for (var j = 0; j < 2; j++) {
            if (a[i][0] !== b[j][0]) continue;
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
        // エラーなら削除して次へ
        combos.splice(i, 1);
        i--;
        continue;
      }

      // 接続先がなければスルー
      if (matches.length < 1) continue;

      // 接続先の組み合わせを取り出す
      var match = matches.shift();

      // 接続元（ルートの端点
      var from = match[0] === 0 ? start : end;

      // 接続先（fromに対応する組み合わせの端点
      var till = match[1] === 0 ? former : latter;

      // 接続条件（インデックスの一致≠方向の一致）に合致しなければスルー
      if ((match[0] === match[1]) === (from[1] === till[1])) continue;

      // 新しい端点
      var adapter = match[1] === 0 ? latter : former;

      // インデックスの一致する場合は逆転
      if (match[0] === match[1]) adapter[1] = !adapter[1];

      // ルート格納
      match[0] === 0 ? route.unshift(adapter) : route.push(adapter);

      // 組み合わせから消す
      combos.splice(i, 1);

      break;
    }
  }

  // パス連結処理
  for (var i = 0; i < pal; i++) {
    if (!route[i][1]) normalize(paths[route[i][0]]);
    if (i === 0) continue;
    connecting(paths[route[i][0]], paths[route[0][0]]);
  }

  // 仕上げ処理
  return paths[route[0][0]];
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

// なめらかにする
function smoothing(points, index) {
  var xedni = index === 0 ? points.length - 1 : index - 1;
  var current = points[index];
  var previous = points[xedni];
  var range = getRange(current, previous);
  // 2点間の距離が0なら1点に統合して終了
  if (toRound(range) === 0) {
    previous.rightDirection = current.rightDirection;
    current.remove();
    return;
  }
  // 現ポイントの絶対角度
  if (hasHandle(current, "right")) {
    var caa = getAngle(current.rightDirection, current.anchor);
  } else {
    var next = points[index + 1];
    if (next === undefined) return;
    var caa = hasHandle(next, "left") ? getAngle(next.leftDirection, current.anchor) : getAngle(next.anchor, current.anchor);
  }
  // 前ポイントの絶対角度
  if (hasHandle(previous, "left")) {
    var paa = getAngle(previous.leftDirection, previous.anchor);
  } else {
    var before = points[xedni - 1];
    if (before === undefined) return;
    var paa = hasHandle(before, "right") ? getAngle(before.rightDirection, previous.anchor) : getAngle(before.anchor, previous.anchor);
  }
  // 各種計算
  var tilt = getAngle(current.anchor, previous.anchor);
  var cra = caa - tilt; // 現ポイントの相対角度
  var pra = paa - tilt; // 前ポイントの相対角度
  var apex = Math.abs(180 - Math.abs(pra - cra)); // 仮想の頂点
  var radius = range / Math.cos(toRad((180 - apex) / 2)) / 2; // 円弧に近似
  var handle = (4 / 3) * Math.tan(toRad(apex) / 4) * radius; // ハンドルの長さ
  // ハンドル操作
  current.leftDirection = getDirection(current, handle, 180 - caa);
  current.pointType = PointType.SMOOTH;
  previous.rightDirection = getDirection(previous, handle, 180 - paa);
  previous.pointType = PointType.SMOOTH;
  return;
}

// ハンドル座標計算
function getDirection(point, range, angle) {
  return [point.anchor[0] + range * Math.cos(toRad(angle)), point.anchor[1] - range * Math.sin(toRad(angle))];
}

// ハンドル存在チェック
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

// オープンパス（孤立点除く）を抽出
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
