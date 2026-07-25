import type { Book } from "./catalog";

type RankingRow=[string,string,string,string];
const rows:RankingRow[]=[
 ["9784868370123","DETECTIVE X CASE FILE #3『地図にない島』","道尾秀介・SCRAP","https://tshop.r10s.jp/book/cabinet/0123/9784868370123.jpg"],
 ["9784103534402","夏帆","村上春樹","https://tshop.r10s.jp/book/cabinet/4402/9784103534402_1_2.jpg"],
 ["9784299064042","一次元の挿し木","松下龍之介","https://tshop.r10s.jp/book/cabinet/4042/9784299064042.jpg"],
 ["9784344988064","80代になるとたいていボケるか死ぬ。70代は神様から与えられた特別な時間","林真理子","https://tshop.r10s.jp/book/cabinet/8064/9784344988064_1_4.jpg"],
 ["9784594103811","陰陽師に人生めちゃくちゃにされたけど金運が爆上がりした話","コヤッキー","https://tshop.r10s.jp/book/cabinet/3811/9784594103811_1_3.jpg"],
 ["9784046606204","夜は猫といっしょ 10 キュルガフィギュア付き特装版","キュルZ","https://tshop.r10s.jp/book/cabinet/6204/9784046606204.jpg"],
 ["9784041174951","パンどろぼうとさすらいラーメン","柴田ケイコ","https://tshop.r10s.jp/book/cabinet/4951/9784041174951_1_4.jpg"],
 ["9784296121045","イン・ザ・メガチャーチ","朝井リョウ","https://tshop.r10s.jp/book/cabinet/1045/9784296121045_1_4.jpg"],
 ["9784866579351","天官賜福 6","墨香銅臭","https://tshop.r10s.jp/book/cabinet/9351/9784866579351_1_9.jpg"],
 ["9784065443118","星を編む","凪良ゆう","https://tshop.r10s.jp/book/cabinet/3118/9784065443118_1_3.jpg"],
 ["9784794971562","急に具合が悪くなる","宮野真生子・磯野真穂","https://tshop.r10s.jp/book/cabinet/1562/9784794971562_1_12.jpg"],
 ["9784065429839","多類婚姻譚","凪良ゆう","https://tshop.r10s.jp/book/cabinet/9839/9784065429839_1_4.jpg"],
 ["9784344045996","謎の先には“開運”がある！ 歴史ミステリとパワースポットを調べてわかったこと","桜井識子","https://tshop.r10s.jp/book/cabinet/5996/9784344045996_1_2.jpg"],
 ["9784101240664","幽冥の岸 十二国記","小野不由美","https://tshop.r10s.jp/book/cabinet/0664/9784101240664.jpg"],
 ["9784093867696","ファイア・ドーム（上）","辻村深月","https://tshop.r10s.jp/book/cabinet/7696/9784093867696_1_170.jpg"],
 ["9784087035711","ONE PIECE novel ZORO","尾田栄一郎・江坂純","https://tshop.r10s.jp/book/cabinet/5711/9784087035711_1_46.jpg"],
 ["9784163921327","永遠の記憶","東野圭吾","https://tshop.r10s.jp/book/cabinet/1327/9784163921327_1_14.jpg"],
 ["9784101061429","成瀬は信じた道をいく","宮島未奈","https://tshop.r10s.jp/book/cabinet/1429/9784101061429.jpg"],
 ["9784334111304","白い夜のセレナーデ","赤川次郎","https://tshop.r10s.jp/book/cabinet/1304/9784334111304.gif"],
 ["9784041166642","777 トリプルセブン","伊坂幸太郎","https://tshop.r10s.jp/book/cabinet/6642/9784041166642_1_20.jpg"],
];
export const rankingPeriod="2026年7月6日〜7月12日";
export const rankingSourceUrl="https://books.rakuten.co.jp/ranking/weekly/001004/";
export const currentRanking:Book[]=rows.map(([isbn,title,author,coverImage],index)=>({id:`weekly-${index+1}`,isbn,title,author,authorSlug:"",coverImage,synopsis:"楽天ブックス公式「小説・エッセイ」週間ランキング掲載作品。",genres:["その他"],publishedYear:2026}));