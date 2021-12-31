const axios = require("axios");
const dayjs = require("dayjs");

let response;

exports.lambdaHandler = async (event, context) => {
  try {
    console.log(event);
    // 集計期間
    const startDate = dayjs(event.queryStringParameters.startDate).format(
      "YYYY-MM-DD"
    );
    const endDate = dayjs(event.queryStringParameters.endDate).format(
      "YYYY-MM-DD"
    );
    // DocBase URL
    const BASE_URL = "https://api.docbase.io/";

    // APIアクセストークン
    const API_TOKEN = process.env.API_TOKEN;

    // ドメイン
    const DOMAIN = process.env.DOMAIN;

    // 検索条件
    const SEARCH = encodeURI(`group:${process.env.SEARCH}`);

    // 集計結果
    let result = [];

    // 初回リクエストURL (%20は条件の結合)
    let requestURL = `${BASE_URL}teams/${DOMAIN}/posts?page=1&per_page=100&q=desc:likes%20${SEARCH}%20created_at:${startDate}~${endDate}`;

    while (requestURL) {
      console.log(requestURL);
      // メモの検索リクエスト
      const res = await axios.get(requestURL, {
        headers: { "X-DocBaseToken": API_TOKEN },
      });

      console.log(res.status);

      requestURL = res.data.meta.next_page;

      let zeroCount = 0;

      // 集計
      res.data.posts.forEach((post) => {
        // good 0件
        if (post.good_jobs_count < 1) {
          // good_jobs_count降順で取得できていない時があるため、20回連続でgood_jobs_count=0なら終了
          zeroCount++;
          if (zeroCount > 20) {
            requestURL = "";
          }
        } else {
          zeroCount = 0;
          // ユーザーがすでに集計結果にいるか
          let index = result.findIndex((user) => user.name === post.user.name);
          if (index != -1) {
            // 対象ユーザーにgood件数追加
            result[index].sum += post.good_jobs_count;
          } else {
            // 集計結果にユーザー新規追加
            result.push({ name: post.user.name, sum: post.good_jobs_count });
          }
        }
      });
    }

    // 降順ソート
    result = result.sort(function (a, b) {
      return a.sum > b.sum ? -1 : 1;
    });

    response = {
      statusCode: 200,
      body: JSON.stringify(result),
      isBase64Encoded: false,
    };
  } catch (err) {
    console.log(err);
    return err;
  }

  return response;
};
