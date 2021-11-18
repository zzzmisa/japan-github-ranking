# Contribution Guide

## 動かし方

### params

`params.json.sample`の中身を自分の環境変数に書き変えて、ファイル名を`params.json`にしておく。  
`output_repository_name`には、予め作成したレポジトリ名を指定する。

```
{
  "github_personal_access_token": "ghp_xxxx",
  "output_repogitory_owner": "zzzmisa",
  "output_repository_name": "japan-github-ranking"
}
```

### コマンド

```
# install dependencies
npm install

# 実行
npm run start

# デプロイ
npm run deploy
```

デプロイの前には IBM Cloud にログインし、デプロイ先のターゲットを選んでおく。  
cf. https://cloud.ibm.com/functions/learn/cli
