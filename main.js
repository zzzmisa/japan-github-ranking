// TODO: newと▲マークの追加
const { App } = require('@octokit/app');

/**
 * main() GitHubから日本語で書かれているっぽいリポジトリを取得・整形しランキング形式でアウトプット
 * @param Cloud Functions アクションは 1 つのパラメーターを受け入れます。このパラメーターは JSON オブジェクトでなければなりません。
 * @return このアクションの出力。この出力は、JSON オブジェクトでなければなりません。
 */
async function main(params) {
  console.log('Start at ' + new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }));
  const githubApp = await setGithubApp(params.octokitInfo);

  const repos = await searchRepos(githubApp, 100);
  const filteredRepos = await filterReposByReadme(githubApp, repos);
  await Promise.all([
    updateReadme(githubApp, filteredRepos.slice(0, 50), params),
    newJsonFile(githubApp, filteredRepos.slice(0, 50), params),
  ]);

  //const fs = require('fs'); // デバッグ用
  //fs.writeFileSync('output.json', JSON.stringify(filteredRepos, null, '\t')) // デバッグ用
  console.log('Completed at ' + new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }));
  return { result: 'OK' };
}

const setGithubApp = async (octokitInfo) => {
  const app = new App({
    appId: octokitInfo.appId,
    privateKey: octokitInfo.privateKey,
    oauth: {
      clientId: octokitInfo.oauth.clientId,
      clientSecret: octokitInfo.oauth.clientSecret,
    },
  });

  const installationOctokit = await app.getInstallationOctokit(octokitInfo.installationId).catch((err) => {
    throw err;
  });
  return installationOctokit;
};

/**
 * GitHubのSearch APIで、ひらがなが含まれているレポジトリを取得
 * @param octokit
 * @param {number} returnNum - 結果として返すリポジトリの数
 * @return {Promise} - Promiseオブジェクトは、GitHub APIから取得したレポジトリの配列
 */
const searchRepos = async (octokit, returnNum) => {
  let repos = [];

  // PerrPage: 一度に何件のレポジトリを取得するか。API制限により最大100まで
  const readmePerPage = 100;
  const descriptionPerPage = 100;

  // TotalPages: 合計何ページ取得するか。PerrPage * TotalPages が最終的な取得件数
  const readmeTotalPages = 3; // in: readme での検索結果は、filteredByDescriptionで削除されるものが多いため多めに3ページ取得する
  const descriptionTotalPages = 1;

  // SearchKeywords: 検索に使う文字。2021/10現在予めこれらの文字で検索してみて、より多くの結果を返す順に並べてある。
  // カタカナ1文字はうまく検索されないので、ひらがなのみで検索
  // prettier-ignore
  const readmeSearchKeywords = [
    'の', 'を', 'で', 'す', 'る', 'に', 'て', 'た',
    'い', 'し', 'と', 'は', 'ま', 'な', 'が', 'れ',
    'か'/*, 'こ', 'ら', 'さ', 'き', 'く', 'っ', 'う',
    'り', 'も', 'よ', 'あ', 'め', 'だ', 'み', 'け',
    'つ', 'ん', 'そ', 'せ', 'ど', 'お', 'や', 'え',
    'ち', 'わ', 'ば', 'じ', 'ず', 'ご', 'へ', 'び',
    'べ', 'ろ', 'げ', 'む', 'ほ', 'ょ', 'ぞ', 'ね',
    'ぶ', 'づ', 'ぐ', 'ひ', 'ぼ', 'ざ', 'ぎ', 'ぜ',
    'ゆ', 'ぽ', 'ふ', 'ぱ', 'ぁ', 'ぬ', 'ゅ', 'ぷ',
    'ぴ', 'ぇ', 'ぃ', 'ぺ', 'ぉ', 'ぅ', 'ゐ', 'ぢ',
    'ゑ', 'ゎ', 'ゔ', 'ゕ', 'ゖ'*/
  ]

  // prettier-ignore
  const descriptionSearchKeywords = [
    'の', 'を', 'で', 'す', 'る', 'た', 'し', 'に',
    'て', 'い', 'と', 'め', 'な', 'っ', 'ま', 'か',
    'き'/*, 'ら', 'う', 'く', 'み', 'り', 'よ', 'が',
    'れ', 'は', 'つ', 'ん', 'や', 'け', 'も', 'さ',
    'お', 'こ', 'あ', 'じ', 'だ', 'え', 'ど', 'せ',
    'ち', 'わ', 'ろ', 'そ', 'ぶ', 'び', 'へ', 'べ',
    'ご', 'げ', 'む', 'ょ', 'ず', 'ば', 'ね', 'ぼ',
    'ぽ', 'ひ', 'ぐ', 'ふ', 'ほ', 'ゆ', 'ぎ', 'ぞ',
    'づ', 'ぷ', 'ゅ', 'ぜ', 'ざ', 'ぱ', 'ぁ', 'ぇ',
    'ぴ', 'ぬ', 'ぃ', 'ぺ', 'ぉ', 'ぅ', 'ゐ', 'ゑ',
    'ぢ', 'ゎ', 'ゔ', 'ゕ', 'ゖ'*/
  ]

  const QUERY_SEARCH_REPOGITORIES = `
  query searchRepogitories($q: String!, $last: Int, $after: String) {
    search(type: REPOSITORY, query: $q, last: $last, after: $after) {
      nodes {
        ... on Repository {
          id
          owner {
            login
            avatarUrl
          }
          name
          description
          stargazerCount
          forkCount
          pushedAt
        }
      }
      pageInfo {
        endCursor
        hasNextPage
      }
    }
  }  
  `;

  // --- in: readme ここから ---
  for (const i in readmeSearchKeywords) {
    let cursor = null;
    for (let j = 1; j <= readmeTotalPages; j++) {
      const {
        search: { nodes, pageInfo },
      } = await octokit.graphql(QUERY_SEARCH_REPOGITORIES, {
        q: `${readmeSearchKeywords[i]} sort:stars-desc in:readme`,
        after: cursor,
        last: readmePerPage,
      });

      // Descriptionにかなが含まれていないものは削除
      const filteredByDescription = nodes.filter((repo) => {
        if (!repo.description) return false;
        return countKana(repo.description) > 0;
      });

      repos = [...repos, ...filteredByDescription];
      repos = removeDuplicates(repos, 'id');
      repos = sortDescending(repos, 'stargazerCount');
      repos = repos.slice(0, returnNum);

      cursor = pageInfo.endCursor;
      if (!cursor) break;
    }
  }
  // --- in: readme ここまで。in: description ここから ---
  for (const i in descriptionSearchKeywords) {
    let cursor = null;
    for (let j = 1; j <= descriptionTotalPages; j++) {
      const {
        search: { nodes, pageInfo },
      } = await octokit.graphql(QUERY_SEARCH_REPOGITORIES, {
        q: `${descriptionSearchKeywords[i]} sort:stars-desc in:description`,
        after: cursor,
        last: descriptionPerPage,
      });

      repos = [...repos, ...nodes];
      repos = removeDuplicates(repos, 'id');
      repos = sortDescending(repos, 'stargazerCount');
      repos = repos.slice(0, returnNum);

      cursor = pageInfo.endCursor;
      if (!cursor) break;
      // --- in: description ここまで ---
    }
  }
  return repos;
};

/**
 * レポジトリのReadmeを取得して、
 * ひらがな・カタカナがkanaLowerLimit以上書かれていないものは削除
 * @param octokit
 * @param {Array.<Object>} repos　- レポジトリの配列。オブジェクトは GitHub API から取得したままのフィールドを持っていること。
 * @return {Promise} - Promiseオブジェクトは、必要なフィールドのみに整形したレポジトリの配列
 */
const filterReposByReadme = async (octokit, repos) => {
  const kanaLowerLimit = 20;

  const getRepos = async (repos) => {
    const formattedRepos = await Promise.all(repos.map(getAndFormatRepo));
    const filteredRepos = formattedRepos.filter(Boolean);
    const addedRankingRepos = filteredRepos.map((value, index) => ({ ranking: index + 1, ...value }));
    return addedRankingRepos;
  };

  const getAndFormatRepo = async (repo) => {
    return octokit
      .request('GET /repos/{owner}/{repo}/readme', {
        owner: repo.owner.login,
        repo: repo.name,
      })
      .then(({ data }) => {
        const readme = Buffer.from(data.content, 'base64').toString();
        if (countKana(readme) < kanaLowerLimit) return false;
        else {
          return {
            id: repo.id,
            login: repo.owner.login,
            name: repo.name,
            description: repo.description,
            stargazerCount: repo.stargazerCount,
            forks_count: repo.forkCount,
            pushedAt: repo.pushedAt,
            avatarUrl: repo.owner.avatarUrl,
          };
        }
      })
      .catch((err) => {
        if (err.status == 404) return false;
        else throw err;
      });
  };

  return getRepos(repos);
};

/**
 * データを元にREADME.mdを更新
 * @param octokit
 * @param  {Array.<Object>} repos - 必要なフィールドのみに整形したレポジトリの配列
 * @param  {Object} params - Cloud Functions アクションのparams。
 * params.output_repogitory_owner と params.output_repository_nameを使う。
 * @return {Promise}
 */
const updateReadme = async (octokit, repos, params) => {
  const introSection =
    `# Japan GitHub Ranking\n\n` +
    `![Japan GitHub Ranking](japan-github-ranking.png)\n` +
    `DescriptionとReadme両方に日本語がある程度書かれているリポジトリを、スター数で並べ替えたランキングです。` +
    `毎日自動で更新されます。データは簡易的に作成しており非公式です。\n\n` +
    `Repositories with some Japanese sentences for descriptions and README are sorted by GitHub stars in the ranking. ` +
    `Automatically update daily. The data is aggregated without taking proper steps and unofficial.\n\n`;

  const date = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
  const dateSection = `_Last Update Time: ${date}_\n\n`;
  const horizontalLine = `***\n`;

  const dtddElmArr = repos.map(
    (repo, i) =>
      `  <dt>${i + 1}位</dt>\n` +
      `  <dd>\n` +
      `    <img src="${repo.avatarUrl}" alt="${repo.login}" width="36" height="36"><br>\n` +
      `    <a href="https://github.com/${repo.login}/${repo.name}/" ><b>${repo.login}/${repo.name}</b></a><br>\n` +
      `    <i>☆ ${repo.stargazerCount}</i><br>\n` +
      `    ${repo.description}\n` +
      `  </dd>\n`
  );
  const dlElm = `<dl>\n` + dtddElmArr.join('') + `</dl>\n`;

  // 2020年8月現在、GraphQLではファイル作成はできないっぽいので、RESTを使う。
  // cf. https://github.community/t/how-to-create-a-file-use-graphql-api-v4-in-specific-branch/13649/5
  const getReadmeRes = await octokit
    .request('GET /repos/{owner}/{repo}/contents/{path}', {
      owner: params.output_repogitory_owner,
      repo: params.output_repository_name,
      path: 'README.md',
    })
    .catch((err) => {
      if (err.status == 404) return false;
      // Not found の場合は下記リスエスト時にshaを設定しない
      else throw err;
    });

  const updateReadmeRes = await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
    owner: params.output_repogitory_owner,
    repo: params.output_repository_name,
    path: 'README.md',
    message: 'Auto update: README.md',
    content: Buffer.from(introSection + horizontalLine + dateSection + dlElm, 'utf-8').toString('base64'),
    sha: getReadmeRes ? getReadmeRes.data.sha : null,
  });

  return updateReadmeRes;
};

/**
 * データを日付毎に新しいJSONファイルに書き込む
 * @param octokit
 * @param repos {Array.<Object>} - 必要なフィールドのみに整形したレポジトリの配列
 * @param  {Object} params - Cloud Functions アクションのparams。
 * このメソッドでは、params.output_repogitory_ownerとparams.output_repository_nameを使う。
 * @return {Promise}
 */
const newJsonFile = async (octokit, repos, params) => {
  // toLocaleString()で返される文字列の形式は実行環境によって変わるので使わない。
  // よってファイル名に使う日本時間は自分で計算する。どの local time zone で実行されても良いように、UTCを基準に計算する。
  const date = new Date();
  date.setHours(date.getHours() + 9);
  const fileName =
    'data-' +
    ('0000' + date.getUTCFullYear()).slice(-4) +
    '-' +
    ('00' + (date.getUTCMonth() + 1)).slice(-2) + // getUTCMonthはゼロベース値なのでプラス1する
    '-' +
    ('00' + date.getUTCDate()).slice(-2) +
    '.json';

  const newContentsRes = await octokit
    .request('PUT /repos/{owner}/{repo}/contents/{path}', {
      owner: params.output_repogitory_owner,
      repo: params.output_repository_name,
      path: `data/${fileName}`,
      message: 'Auto update: New JSON file',
      content: Buffer.from(JSON.stringify(repos, null, '\t'), 'utf-8').toString('base64'),
    })
    .catch((err) => {
      if (err.message.indexOf(`"sha" wasn't supplied.`) !== -1) return err.message;
      else throw err;
    });

  return newContentsRes;
};

// --- 汎用的なメソッドここから ---

/**
 * 文字列に含まれるひらがなとカタカナをカウント
 * @param {string} - この文字列に含まれているひらがなとカタカナをカウントする
 * @return {number}
 */
const countKana = (str) => (str.match(/[ぁ-んァ-ヶ]/g) || []).length;

/**
 * オブジェクトの配列から重複を削除
 * @param {Array.<Object>} items - オブジェクトの配列
 * @param {string} key - 重複判定に使うキー
 * @return {Array.<Object>} - 重複を削除したオブジェクトの配列
 */
const removeDuplicates = (items, key) => {
  const map = new Map(items.map((item) => [item[key], item]));
  return Array.from(map.values());
};

/**
 * オブジェクトの配列を降順に並び替え
 * @param {Array.<Object>} items - オブジェクトの配列
 * @param {string} key - ソート判定に使うキー
 * @return {Array.<Object>} - ソートしたオブジェクトの配列
 */
const sortDescending = (items, key) => {
  const copiedItems = items.concat(); // 元の配列が変更されないようコピーを作成
  return copiedItems.sort(function (first, second) {
    if (first[key] > second[key]) return -1;
    if (first[key] < second[key]) return 1;
    return 0;
  });
};
// --- 汎用的なメソッドここまで ---

exports.main = main;
