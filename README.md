スクリプトの目的としてはメニューコマンドの「連結」で実現できない「パス同士のなめらかな連結」と「一発でクローズパスにする」こと。
メニューコマンドと同じルートで連結されるようにしたいがどういうアルゴリズムかいまいち分からん。
「最短距離でつないでいく」という考え方は概ね合ってると思うのだけど…
端点の位置を記録しておいてメニューコマンドの「連結」後に記録を元にハンドル調整していくバージョンも作ったが、どうやらメニューコマンドを使うほうが処理が遅い
ので、なるべく自前で連結させたいところ（そのほうが面白いし

現状は以下の流れ
１）パスの端点同士の組み合わせをすべて配列化
  なお、端点は始点と終点があるので、連結するときのパスの方向もそれぞれおboolで記録
  「パスAの終点とパスBの始点＝正順と正順」「Aの始点とBの終点＝逆順と逆順＝」「Aの始点とBの始点＝逆順と正順」「Aの終点とBの終点＝正順と逆順」の４種の組み合わせがある
  端点間の距離も記録
２）組み合わせの配列を距離の近い順でソート
３）ソートした配列の先頭からルート構築を開始
  最初の組み合わせをルート配列に格納 → 組み合わせ配列をループして、１.重複するものを排除しながら、２.現在のルートの始点or終点に接続できるものを格納していく
  ルートの配列の長さがパスと同数になったら終了
４）できたルート配列を元に接続し、ハンドルを調整

特に３）に問題がある。
v2までは重複確認頼りでループを１回にしていたため、v3でwhileループでルート完成まで最初から走査しなおすようにした。
３）の1.の部分に問題があるのか、２.の部分に問題があるのか、その両方か、それすらよく分からなくなってきたぞ！
