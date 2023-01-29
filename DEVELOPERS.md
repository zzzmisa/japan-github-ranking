# Developing Japan GitHub Ranking

## システム概要

[日本語しか読みたくない人ための GitHub ランキング - zzzmisa's blog](https://blog.zzzmisa.com/japan-github-ranking/)

## 動かし方

### params

`params.json.sample`の中身を自分の環境変数に書き変えて、ファイル名を`params.json`にしておく。

```
{
  "github_personal_access_token": "ghp_xxxx",
  "output_repogitory_owner": "zzzmisa",
  "output_repository_name": "japan-github-ranking"
}
```

- `github_personal_access_token`
  - [Personal access tokens](https://github.com/settings/tokens)で作成したトークン。出力先のレポジトリへの書き込み権限を付与しておく。公開リポジトリに書き込む場合は Select scopes で`public_repo`、プライベートリポジトリの場合は、`repo`全てを選択。
- `output_repository_name`
  - 出力先のレポジトリ名。予め作成しておく。

### コマンド

```
# install dependencies
npm install

# 手動で実行
npm run start

# IBM Cloud Functionsへのデプロイ
npm run deploy
```

デプロイの前には IBM Cloud にログインし、デプロイ先のターゲットを選んでおく。  
cf. https://cloud.ibm.com/functions/learn/cli

```
# コマンド例:
% ibmcloud login -a cloud.ibm.com
% ibmcloud target -g Default
% ibmcloud target --cf
% ibmcloud fn namespace target app2
```

動作確認に使っている IBM Cloud CLI のバージョン:

```
% ibmcloud -v
ibmcloud version 2.14.0+fd1bfc6-2023-01-24T22:26:21+00:00
```
