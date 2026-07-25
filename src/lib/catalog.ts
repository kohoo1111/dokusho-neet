import { intelligenceFor } from "@/lib/book-intelligence";

export type AwardName = "本屋大賞" | "芥川賞" | "直木賞" | "このミステリーがすごい！" | "本格ミステリ大賞" | "江戸川乱歩賞" | "山本周五郎賞" | "吉川英治文学賞" | "日本推理作家協会賞" | "日本SF大賞" | "柴田錬三郎賞" | "野間文芸賞" | "谷崎潤一郎賞" | "三島由紀夫賞";
export type ClassicGroup = "日本文学" | "海外文学" | "テーマ別";

export type Book = {
  id: string;
  title: string;
  author: string;
  authorSlug: string;
  isbn: string;
  synopsis: string;
  genres: string[];
  publishedYear: number;
  awards?: { name: AwardName; year: number }[];
  classicGroup?: ClassicGroup;
  amazonRank?: number;
  rakutenRank?: number;
  featured?: boolean;
  coverImage?: string;
  publisher?: string;
  rakutenUrl?: string;
};

export type Theme = { slug: string; name: string; description: string };
export type Author = { slug: string; name: string; kana: string; popularity: number; bio: string };
export type AwardDefinition={slug:string;name:AwardName;category:string;description:string};

export const awardDefinitions:AwardDefinition[]=[
 {slug:"honya-taisho",name:"本屋大賞",category:"書店員",description:"全国の書店員が、最も売りたい本を投票で選ぶ文学賞。"},{slug:"akutagawa",name:"芥川賞",category:"純文学",description:"新進作家による純文学作品に贈られる、日本を代表する文学賞。"},{slug:"naoki",name:"直木賞",category:"エンタメ",description:"新進・中堅作家の大衆文学作品から選ばれる文学賞。"},{slug:"kono-mys",name:"このミステリーがすごい！",category:"ミステリー",description:"ミステリー界の専門家が選ぶ、年末恒例の作品ランキング。"},{slug:"honkaku-mystery",name:"本格ミステリ大賞",category:"ミステリー",description:"本格ミステリ作家クラブが選ぶ、本格推理小説の年間賞。"},{slug:"edogawa-rampo",name:"江戸川乱歩賞",category:"ミステリー",description:"推理小説の登竜門として知られる公募型の文学賞。"},{slug:"yamamoto-shugoro",name:"山本周五郎賞",category:"エンタメ",description:"優れた物語性を持つ新しい文芸作品に贈られる賞。"},{slug:"yoshikawa-eiji",name:"吉川英治文学賞",category:"文学",description:"大衆文学の優れた作品と作家を顕彰する文学賞。"},{slug:"mystery-writers-japan",name:"日本推理作家協会賞",category:"ミステリー",description:"推理文学の発展に寄与した作品へ贈られる歴史ある賞。"},{slug:"nihon-sf",name:"日本SF大賞",category:"SF",description:"年間を代表するSF作品を幅広い表現分野から選ぶ賞。"},{slug:"shibata-renzaburo",name:"柴田錬三郎賞",category:"エンタメ",description:"現代小説・時代小説から優れた作品を選ぶ文学賞。"},{slug:"noma",name:"野間文芸賞",category:"純文学",description:"円熟した作家の優れた文芸作品に贈られる賞。"},{slug:"tanizaki",name:"谷崎潤一郎賞",category:"文学",description:"時代を代表する優れた小説・戯曲に贈られる賞。"},{slug:"mishima",name:"三島由紀夫賞",category:"純文学",description:"文学の前途を拓く、新鋭の作品に贈られる賞。"}
];

const allThemes: Theme[] = [
  { slug: "mystery", name: "ミステリー", description: "謎を追う時間まで物語になる、ページを閉じられない一冊。" },
  { slug: "romance", name: "恋愛", description: "誰かを想う気持ちの輪郭を、静かに照らす物語。" },
  { slug: "moving", name: "感動", description: "読み終えたあと、いつもの景色が少し違って見える本。" },
  { slug: "business", name: "ビジネス", description: "仕事と意思決定の解像度を上げる、実践的な知恵。" },
  { slug: "self-help", name: "自己啓発", description: "明日の行動を小さく変える、考え方との出会い。" },
  { slug: "sf", name: "SF", description: "科学と想像力の先にある、まだ見ぬ世界へ。" },
  { slug: "horror", name: "ホラー", description: "怖さの奥に潜む、人間の本質を覗く物語。" },
  { slug: "essay", name: "エッセイ", description: "誰かの日常から、自分の暮らしを見つめ直す。" },
  { slug: "youth", name: "青春", description: "迷いながら進む時間を肯定してくれる物語。" },
  { slug: "history", name: "歴史", description: "過去を知り、いまを別の角度から考える。" },
  { slug: "philosophy", name: "哲学", description: "答えのない問いと向き合い、自分の考えを深める。" },
  { slug: "other", name: "その他", description: "ジャンルの境界を越えて届く、忘れられない一冊。" },
];
export const themes:Theme[]=allThemes.filter(theme=>["mystery","romance","self-help"].includes(theme.slug));

const coreAuthors: Author[] = [
  { slug: "keigo-higashino", name: "東野圭吾", kana: "ひがしのけいご", popularity: 100, bio: "緻密な謎と人間の感情を重ね、読者を最後の一行まで連れていく作家。" },
  { slug: "mizuki-tsujimura", name: "辻村深月", kana: "つじむらみづき", popularity: 94, bio: "孤独や痛みに寄り添いながら、希望へつなぐ物語を描く作家。" },
  { slug: "kotaro-isaka", name: "伊坂幸太郎", kana: "いさかこうたろう", popularity: 96, bio: "軽快な会話と巧みな伏線で、世界の見え方を更新する作家。" },
  { slug: "haruki-murakami", name: "村上春樹", kana: "むらかみはるき", popularity: 98, bio: "独自のリズムと比喩で、現実と心の深層を往復する作家。" },
  { slug: "kanae-minato", name: "湊かなえ", kana: "みなとかなえ", popularity: 93, bio: "静かな語りの奥に、人間心理の暗部を鮮烈に映す作家。" },
  { slug: "sayaka-murata", name: "村田沙耶香", kana: "むらたさやか", popularity: 89, bio: "社会の普通を問い直す、鋭くユーモラスな視点を持つ作家。" },
  { slug: "hiro-arikawa", name: "有川ひろ", kana: "ありかわひろ", popularity: 91, bio: "日常の温度とまっすぐな感情を、読みやすい物語へ結ぶ作家。" },
  { slug: "osamu-dazai", name: "太宰治", kana: "だざいおさむ", popularity: 95, bio: "弱さと可笑しみをさらけ出し、世代を越えて読まれる作家。" },
  { slug: "soseki-natsume", name: "夏目漱石", kana: "なつめそうせき", popularity: 92, bio: "近代を生きる個人の孤独と葛藤を描いた、日本文学の巨匠。" },
  { slug: "antoine", name: "サン＝テグジュペリ", kana: "さんてぐじゅぺり", popularity: 90, bio: "大切なものの本質を、簡潔で詩的な物語に託した作家。" },
  { slug: "paulo-coelho", name: "パウロ・コエーリョ", kana: "ぱうろこえーりょ", popularity: 87, bio: "夢を追う勇気を寓話的な物語で語るブラジルの作家。" },
  { slug: "liu-cixin", name: "劉慈欣", kana: "りゅうじきん", popularity: 88, bio: "壮大な宇宙観と科学的想像力で世界を驚かせたSF作家。" },
  { slug: "machida-sonoko", name: "町田そのこ", kana: "まちだそのこ", popularity: 86, bio: "声にならない痛みを拾い、再生へつなぐ物語を描く作家。" },
  { slug: "riku-onda", name: "恩田陸", kana: "おんだりく", popularity: 85, bio: "音楽、記憶、幻想を横断し、豊かな読書体験を生む作家。" },
  { slug: "noriko-morishita", name: "森下典子", kana: "もりしたのりこ", popularity: 80, bio: "日々の小さな気づきを、静かで澄んだ言葉にすくい上げる書き手。" },
  { slug: "ryotaro-shiba", name: "司馬遼太郎", kana: "しばりょうたろう", popularity: 93, bio: "歴史の大きな流れと人間の息遣いを同時に描いた国民的作家。" },
];

const additionalAuthorRows: [string,string,string][] = [
 ["hiroshi-mori","森博嗣","もりひろし"],["miyuki-miyabe","宮部みゆき","みやべみゆき"],["natsuhiko-kyogoku","京極夏彦","きょうごくなつひこ"],["seishi-yokomizo","横溝正史","よこみぞせいし"],["ranpo-edogawa","江戸川乱歩","えどがわらんぽ"],["yukito-ayatsuji","綾辻行人","あやつじゆきと"],["alice-arisugawa","有栖川有栖","ありすがわありす"],["shusuke-michio","道尾秀介","みちおしゅうすけ"],["tetsuya-honda","誉田哲也","ほんだてつや"],["hideo-yokoyama","横山秀夫","よこやまひでお"],
 ["shuichi-yoshida","吉田修一","よしだしゅういち"],["koki-mitani","三谷幸喜","みたにこうき"],["ban-ana-yoshimoto","吉本ばなな","よしもとばなな"],["hiromi-kawakami","川上弘美","かわかみひろみ"],["yoko-ogawa","小川洋子","おがわようこ"],["miri-yu","柳美里","ゆうみり"],["yoko-tawada","多和田葉子","たわだようこ"],["mieko-kawakami","川上未映子","かわかみみえこ"],["risa-wataya","綿矢りさ","わたやりさ"],["hitomi-kanehara","金原ひとみ","かねはらひとみ"],
 ["shion-miura","三浦しをん","みうらしをん"],["miwako-sumida","角田光代","かくたみつよ"],["kiwao-nomura","朝井リョウ","あさいりょう"],["kanako-nishi","西加奈子","にしかなこ"],["genki-kawamura","川村元気","かわむらげんき"],["takahisa-shirakawa","白川尚史","しらかわたかふみ"],["to-ubukata","冲方丁","うぶかたとう"],["nahoko-uehashi","上橋菜穂子","うえはしなほこ"],["tomihiko-morimi","森見登美彦","もりみとみひこ"],["tomoka-shibasaki","柴崎友香","しばさきともか"],
 ["kobo-abe","安部公房","あべこうぼう"],["yukio-mishima","三島由紀夫","みしまゆきお"],["junichiro-tanizaki","谷崎潤一郎","たにざきじゅんいちろう"],["yasunari-kawabata","川端康成","かわばたやすなり"],["kenji-miyazawa","宮沢賢治","みやざわけんじ"],["ryunosuke-akutagawa","芥川龍之介","あくたがわりゅうのすけ"],["ogai-mori","森鴎外","もりおうがい"],["ichiyo-higuchi","樋口一葉","ひぐちいちよう"],["shusaku-endo","遠藤周作","えんどうしゅうさく"],["shotaro-ikenami","池波正太郎","いけなみしょうたろう"],
 ["keishi-nagi","凪良ゆう","なぎらゆう"],["satoshi-yagisawa","八木沢里志","やぎさわさとし"],["yuta-takayama","原田マハ","はらだまは"],["michiko-aoyama","青山美智子","あおやまみちこ"],["yukiko-motoya","本谷有希子","もとやゆきこ"],["yukiya-shoji","小路幸也","しょうじゆきや"],["eto-mori","森絵都","もりえと"],["megumi-hatakeyama","畠中恵","はたけなかめぐみ"],["fumio-yamamoto","山本文緒","やまもとふみお"],["yuki-shinpo","真保裕一","しんぽゆういち"],
 ["george-orwell","ジョージ・オーウェル","じょーじおーうぇる"],["agatha-christie","アガサ・クリスティ","あがさくりすてぃ"],["arthur-conan-doyle","アーサー・コナン・ドイル","あーさーこなんどいる"],["stephen-king","スティーヴン・キング","すてぃーぶんきんぐ"],["j-k-rowling","J.K.ローリング","じぇいけいろーりんぐ"],["harper-lee","ハーパー・リー","はーぱーりー"],["f-scott-fitzgerald","F・スコット・フィッツジェラルド","ふぃっつじぇらるど"],["ernest-hemingway","アーネスト・ヘミングウェイ","へみんぐうぇい"],["franz-kafka","フランツ・カフカ","ふらんつかふか"],["albert-camus","アルベール・カミュ","あるべーるかみゅ"],
 ["gabriel-garcia-marquez","ガブリエル・ガルシア＝マルケス","がるしあまるけす"],["milan-kundera","ミラン・クンデラ","みらんくんでら"],["hermann-hesse","ヘルマン・ヘッセ","へるまんへっせ"],["fyodor-dostoevsky","ドストエフスキー","どすとえふすきー"],["leo-tolstoy","トルストイ","とるすとい"],["victor-hugo","ヴィクトル・ユゴー","びくとるゆごー"],["jane-austen","ジェイン・オースティン","じぇいんおーすてぃん"],["charlotte-bronte","シャーロット・ブロンテ","しゃーろっとぶろんて"],["virginia-woolf","ヴァージニア・ウルフ","ばーじにあうるふ"],["george-eliot","ジョージ・エリオット","じょーじえりおっと"],
 ["kazuo-ishiguro","カズオ・イシグロ","かずおいしぐろ"],["ian-mcewan","イアン・マキューアン","いあんまきゅーあん"],["julian-barnes","ジュリアン・バーンズ","じゅりあんばーんず"],["sally-rooney","サリー・ルーニー","さりーるーにー"],["margaret-atwood","マーガレット・アトウッド","まーがれっとあとwood"],["donna-tartt","ドナ・タート","どなたーと"],["dan-brown","ダン・ブラウン","だんぶらうん"],["gillian-flynn","ギリアン・フリン","ぎりあんふりん"],["paula-hawkins","ポーラ・ホーキンズ","ぽーらほーきんず"],["andy-weir","アンディ・ウィアー","あんでぃうぃあー"],
 ["ted-chiang","テッド・チャン","てっどちゃん"],["ursula-le-guin","アーシュラ・K・ル＝グウィン","あーしゅらるぐうぃん"],["philip-k-dick","フィリップ・K・ディック","ふぃりっぷでぃっく"],["isaac-asimov","アイザック・アシモフ","あいざっくあしもふ"],["arthur-c-clarke","アーサー・C・クラーク","あーさーくらーく"],["neil-gaiman","ニール・ゲイマン","にーるげいまん"],["matt-haig","マット・ヘイグ","まっとへいぐ"],["fredrik-backman","フレドリック・バックマン","ふれどりっくばっくまん"],["delia-owens","ディーリア・オーエンズ","でぃーりあおーえんず"],["toshikazu-kawaguchi","川口俊和","かわぐちとしかず"],
 ["yuval-noah-harari","ユヴァル・ノア・ハラリ","ゆばるのあはらり"],["daniel-kahneman","ダニエル・カーネマン","だにえるかーねまん"],["james-clear","ジェームズ・クリアー","じぇーむずくりあー"],["cal-newport","カル・ニューポート","かるにゅーぽーと"],["adam-grant","アダム・グラント","あだむぐらんと"],["simon-sinek","サイモン・シネック","さいもんしねっく"],["peter-drucker","ピーター・ドラッカー","ぴーたーどらっかー"],["dale-carnegie","デール・カーネギー","でーるかーねぎー"],["mark-manson","マーク・マンソン","まーくまんそん"],["brene-brown","ブレネー・ブラウン","ぶれねーぶらうん"]
];

export const authors: Author[]=[...coreAuthors,...additionalAuthorRows.map(([slug,name,kana],index)=>({slug,name,kana,popularity:79-(index%35),bio:`${name}の代表作と、次に読みたい作品を紹介します。`}))];

const rawBooks: Book[] = [
  { id:"byakuyako", title:"白夜行", author:"東野圭吾", authorSlug:"keigo-higashino", isbn:"9784087474398", synopsis:"幼い頃に起きた質屋殺しを起点に、光のない世界を歩み続ける二人の人生を描く長編ミステリー。", genres:["ミステリー"], publishedYear:2002 },
  { id:"yougisha-x", title:"容疑者Xの献身", author:"東野圭吾", authorSlug:"keigo-higashino", isbn:"9784167110123", synopsis:"天才数学者が仕組んだ完全犯罪と、それを追う物理学者。愛とは何かを問いかける、論理と感情が交差するミステリー。", genres:["ミステリー","感動"], publishedYear:2008, awards:[{name:"直木賞",year:2006},{name:"このミステリーがすごい！",year:2006},{name:"本格ミステリ大賞",year:2006}], amazonRank:1, rakutenRank:4, featured:true },
  { id:"kagami-no-kojo", title:"かがみの孤城", author:"辻村深月", authorSlug:"mizuki-tsujimura", isbn:"9784591169713", synopsis:"学校に行けなくなったこころの部屋で、鏡が光り始める。孤城に集められた七人が、自分の居場所を見つけていく物語。", genres:["青春","感動","ミステリー"], publishedYear:2021, awards:[{name:"本屋大賞",year:2018}], amazonRank:4, rakutenRank:1, featured:true },
  { id:"golden-slumber", title:"ゴールデンスランバー", author:"伊坂幸太郎", authorSlug:"kotaro-isaka", isbn:"9784101250267", synopsis:"首相暗殺犯に仕立てられた男の逃走劇。人を信じることの強さを、軽快な会話と緻密な伏線で描く。", genres:["ミステリー","青春"], publishedYear:2010, awards:[{name:"本屋大賞",year:2008}], amazonRank:7, rakutenRank:8 },
  { id:"konbini-ningen", title:"コンビニ人間", author:"村田沙耶香", authorSlug:"sayaka-murata", isbn:"9784167911300", synopsis:"コンビニ店員として働くことで世界の一部になれる古倉恵子。「普通」とは何かを鮮やかに問い直す物語。", genres:["その他"], publishedYear:2018, awards:[{name:"芥川賞",year:2016}], amazonRank:6, rakutenRank:9, classicGroup:"テーマ別" },
  { id:"kokuhaku", title:"告白", author:"湊かなえ", authorSlug:"kanae-minato", isbn:"9784575513448", synopsis:"中学校教師の静かな告白から始まる復讐の連鎖。視点が変わるたび、信じていた真実が反転していく。", genres:["ミステリー","ホラー"], publishedYear:2010, awards:[{name:"本屋大賞",year:2009}], amazonRank:3, rakutenRank:6 },
  { id:"52hertz", title:"52ヘルツのクジラたち", author:"町田そのこ", authorSlug:"machida-sonoko", isbn:"9784122073701", synopsis:"誰にも届かない声を抱えた二人が出会い、互いの人生を取り戻していく。痛みの先にある希望を描く物語。", genres:["感動"], publishedYear:2023, awards:[{name:"本屋大賞",year:2021}], amazonRank:8, rakutenRank:2 },
  { id:"honeybees", title:"蜜蜂と遠雷", author:"恩田陸", authorSlug:"riku-onda", isbn:"9784344428522", synopsis:"国際ピアノコンクールに集う若者たち。音楽の歓びと才能のきらめきを、言葉で鮮やかに立ち上げる。", genres:["青春","感動"], publishedYear:2019, awards:[{name:"直木賞",year:2017},{name:"本屋大賞",year:2017}], rakutenRank:10 },
  { id:"norwegian-wood", title:"ノルウェイの森", author:"村上春樹", authorSlug:"haruki-murakami", isbn:"9784062748681", synopsis:"喪失を抱えた青年が、愛することと生きることの間で揺れる。静かな痛みが長く残る青春小説。", genres:["恋愛","青春"], publishedYear:2004, classicGroup:"日本文学", amazonRank:10 },
  { id:"ningen-shikkaku", title:"人間失格", author:"太宰治", authorSlug:"osamu-dazai", isbn:"9784101006055", synopsis:"人間社会に馴染めない大庭葉蔵の手記。弱さと孤独を告白する言葉が、時代を越えて読者の心に触れる。", genres:["その他"], publishedYear:1952, classicGroup:"日本文学", amazonRank:9 },
  { id:"kokoro", title:"こころ", author:"夏目漱石", authorSlug:"soseki-natsume", isbn:"9784101010137", synopsis:"先生と私の交流、そして遺書によって明かされる過去。友情、罪、孤独を静かに見つめる近代文学の名作。", genres:["その他"], publishedYear:1952, classicGroup:"日本文学" },
  { id:"run-melos", title:"走れメロス", author:"太宰治", authorSlug:"osamu-dazai", isbn:"9784101006062", synopsis:"親友との約束を守るため、メロスは日没までに街へ戻ろうと走る。信頼と友情を力強く描く短編。", genres:["青春","感動"], publishedYear:1954, classicGroup:"日本文学" },
  { id:"little-prince", title:"星の王子さま", author:"サン＝テグジュペリ", authorSlug:"antoine", isbn:"9784102122044", synopsis:"小さな星から旅に出た王子さまが出会う人々。大切なものは目に見えないという真理を伝える寓話。", genres:["その他","感動"], publishedYear:2006, classicGroup:"海外文学", rakutenRank:5 },
  { id:"alchemist", title:"アルケミスト", author:"パウロ・コエーリョ", authorSlug:"paulo-coelho", isbn:"9784042750017", synopsis:"宝物を探して旅に出た羊飼いの少年。夢を信じ、心の声に従う勇気を教えてくれる世界的ベストセラー。", genres:["自己啓発","その他"], publishedYear:1997, classicGroup:"海外文学" },
  { id:"three-body", title:"三体", author:"劉慈欣", authorSlug:"liu-cixin", isbn:"9784150122869", synopsis:"文化大革命から宇宙文明との接触へ。人類の未来を揺るがすスケールで描かれる現代SFの金字塔。", genres:["SF"], publishedYear:2024, amazonRank:5, rakutenRank:7 },
  { id:"toshokan-senso", title:"図書館戦争", author:"有川ひろ", authorSlug:"hiro-arikawa", isbn:"9784043898053", synopsis:"本を守る図書隊に入隊した郁の成長と恋。表現の自由というテーマを、痛快なエンターテインメントとして描く。", genres:["恋愛","青春","SF"], publishedYear:2011, classicGroup:"テーマ別" },
  { id:"essentialism", title:"エッセンシャル思考", author:"グレッグ・マキューン", authorSlug:"greg-mckeown", isbn:"9784761270438", synopsis:"より少なく、しかしより良く。本当に重要なことを見極め、そこへ時間とエネルギーを集中する方法を説く。", genres:["ビジネス","自己啓発"], publishedYear:2014, amazonRank:2, rakutenRank:3 },
  { id:"die-with-zero", title:"DIE WITH ZERO", author:"ビル・パーキンス", authorSlug:"bill-perkins", isbn:"9784478109687", synopsis:"人生で最も大切なのは、資産を残すことではなく経験を最大化すること。時間とお金の新しい使い方を提案する。", genres:["自己啓発","ビジネス"], publishedYear:2020, rakutenRank:6 },
  { id:"night-is-short", title:"夜は短し歩けよ乙女", author:"森見登美彦", authorSlug:"tomihiko-morimi", isbn:"9784043878024", synopsis:"京都の夜を歩く黒髪の乙女と、彼女を追う先輩。偶然が連鎖する、奇想天外で愛らしい青春恋愛小説。", genres:["恋愛","青春","その他"], publishedYear:2008, classicGroup:"テーマ別" },
  { id:"nichinichikorekojitsu", title:"日日是好日", author:"森下典子", authorSlug:"noriko-morishita", isbn:"9784101363516", synopsis:"茶道を習い始めた著者が、季節の移ろいと学びの時間を綴る。いま、この瞬間を味わうことの豊かさに気づくエッセイ。", genres:["エッセイ","その他"], publishedYear:2008, classicGroup:"テーマ別" },
  { id:"moeyo-ken", title:"燃えよ剣", author:"司馬遼太郎", authorSlug:"ryotaro-shiba", isbn:"9784101152080", synopsis:"新選組副長・土方歳三の生涯を、幕末の激動とともに描く。信念を貫いて駆け抜けた男の姿が胸を打つ歴史小説。", genres:["歴史","青春"], publishedYear:1972, classicGroup:"日本文学" },
  { id:"houkago", title:"放課後", author:"東野圭吾", authorSlug:"keigo-higashino", isbn:"9784061842519", synopsis:"女子高校で起きた密室殺人。教師として勤める前島が、校内に潜む謎と少女たちの秘密に迫る学園ミステリー。", genres:["ミステリー"], publishedYear:1988, awards:[{name:"江戸川乱歩賞",year:1985}] },
  { id:"kasha", title:"火車", author:"宮部みゆき", authorSlug:"miyuki-miyabe", isbn:"9784101369181", synopsis:"失踪した女性を追う休職中の刑事が、カード社会の暗部へたどり着く。現代社会を鋭く描いた犯罪小説。", genres:["ミステリー"], publishedYear:1998, awards:[{name:"山本周五郎賞",year:1993}] },
  { id:"shinsekai-yori", title:"新世界より", author:"貴志祐介", authorSlug:"yusuke-kishi", isbn:"9784062768535", synopsis:"千年後の日本。超能力を持つ子どもたちは、管理された社会の秘密に触れていく。壮大な世界観のSF長編。", genres:["SF","ホラー"], publishedYear:2011, awards:[{name:"日本SF大賞",year:2008}] },
  { id:"chinmoku", title:"沈黙", author:"遠藤周作", authorSlug:"shusaku-endo", isbn:"9784101123158", synopsis:"キリシタン弾圧下の長崎を訪れた宣教師が、信仰と神の沈黙に向き合う。人間の弱さを見つめる文学作品。", genres:["歴史","その他"], publishedYear:1981, awards:[{name:"谷崎潤一郎賞",year:1966}], classicGroup:"日本文学" },
  { id:"himitsu", title:"秘密", author:"東野圭吾", authorSlug:"keigo-higashino", isbn:"9784167110062", synopsis:"事故で妻を失った男の前に、娘の身体に宿った妻の心が戻る。家族と愛のかたちを問う物語。", genres:["ミステリー","感動"], publishedYear:2001, awards:[{name:"日本推理作家協会賞",year:1999}] },
  { id:"nejimaki-dori", title:"ねじまき鳥クロニクル", author:"村上春樹", authorSlug:"haruki-murakami", isbn:"9784101001418", synopsis:"失踪した妻を探す主人公が、日常の奥に潜む歴史と暴力の記憶へ降りていく長編小説。", genres:["その他","哲学"], publishedYear:2010, awards:[{name:"野間文芸賞",year:1995}], classicGroup:"日本文学" },
  { id:"ko-yado-no-hito", title:"孤宿の人", author:"宮部みゆき", authorSlug:"miyuki-miyabe", isbn:"9784101369297", synopsis:"讃岐の城下町を舞台に、孤独を抱えた人々が出会い、互いを救っていく時代小説。", genres:["歴史","感動"], publishedYear:2009, awards:[{name:"吉川英治文学賞",year:2007}] },
  { id:"semi-shigure", title:"蝉しぐれ", author:"藤沢周平", authorSlug:"shuhei-fujisawa", isbn:"9784167192385", synopsis:"海坂藩を舞台に、少年の成長と淡い恋、武士としての矜持を静かに描く時代小説。", genres:["歴史","青春","恋愛"], publishedYear:1991, awards:[{name:"柴田錬三郎賞",year:1988}], classicGroup:"日本文学" },
  { id:"shiroiro-no-machi", title:"しろいろの街の、その骨の体温の", author:"村田沙耶香", authorSlug:"sayaka-murata", isbn:"9784022647825", synopsis:"郊外のニュータウンで育つ少女の身体感覚と、学校という小さな社会の残酷さを描く。", genres:["青春","その他"], publishedYear:2015, awards:[{name:"三島由紀夫賞",year:2013}] },
];

export const books: Book[] = rawBooks;

export function coverUrl(book: Book) {
  return book.coverImage??`https://thumbnail.image.rakuten.co.jp/@0_mall/book/cabinet/${book.isbn.slice(-4)}/${book.isbn}.jpg`;
}
export function amazonUrl(book: Book) {
  const params = new URLSearchParams({ k: `${book.title} ${book.author}` });
  const tag = process.env.NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG;
  if (tag) params.set("tag", tag);
  return `https://www.amazon.co.jp/s?${params.toString()}`;
}
export function rakutenUrl(book: Book) {
  return book.rakutenUrl ?? `https://books.rakuten.co.jp/search?sitem=${encodeURIComponent(`${book.title} ${book.author}`)}`;
}
export function getBook(id: string) { return books.find((book) => book.id === id); }
export function booksByGenre(name: string) { return books.filter((book) => book.genres.includes(name)); }
export function booksForTheme(name:string,min=12){const target=name as "ミステリー"|"恋愛"|"自己啓発";const matched=books.map((book,index)=>{const intelligence=intelligenceFor(book);return {book,score:(intelligence.themes.includes(target)?100:0)+intelligence.confidence*10-index/100}}).filter(item=>item.score>=100).sort((a,b)=>b.score-a.score).map(item=>item.book);return matched.slice(0,Math.min(Math.max(min,matched.length),matched.length))}
export function booksByAuthor(slug: string) { return books.filter((book) => book.authorSlug === slug); }
export function getTheme(slug: string) { return themes.find((theme) => theme.slug === slug); }
export function getAuthor(slug: string) { return authors.find((author) => author.slug === slug) ?? (() => { const book = books.find((item) => item.authorSlug === slug); return book ? { slug, name:book.author, kana:book.author, popularity:50, bio:`${book.author}の作品を紹介します。` } : undefined; })(); }
export function catalogAuthors(){const bySlug=new Map(authors.map(author=>[author.slug,author]));for(const book of books){if(!bySlug.has(book.authorSlug))bySlug.set(book.authorSlug,{slug:book.authorSlug,name:book.author,kana:book.author,popularity:50,bio:`${book.author}の代表作と関連作品を紹介します。`})}return [...bySlug.values()]}
export function relatedBooks(book: Book) {const source=intelligenceFor(book);return books.filter(item=>item.id!==book.id).map(item=>{const target=intelligenceFor(item);const sharedThemes=target.themes.filter(theme=>source.themes.includes(theme)).length;const sharedTags=target.tags.filter(tag=>source.tags.includes(tag)).length;return {item,score:sharedThemes*8+sharedTags*5+(item.authorSlug===book.authorSlug?10:0)+item.genres.filter(genre=>book.genres.includes(genre)).length}}).sort((a,b)=>b.score-a.score).slice(0,8).map(result=>result.item); }
export function publisherName(book:Book){const prefixes:Record<string,string>={"978416":"文藝春秋","978410":"新潮社","978406":"講談社","978404":"KADOKAWA","978459":"ポプラ社","978434":"幻冬舎","978412":"中央公論新社","978415":"早川書房","978402":"朝日新聞出版","978476":"かんき出版","978447":"ダイヤモンド社"};return Object.entries(prefixes).find(([prefix])=>book.isbn.startsWith(prefix))?.[1]??"出版社情報は購入先でご確認ください"}