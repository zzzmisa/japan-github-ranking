# Developing Japan GitHub Ranking

## システム概要

[日本語しか読みたくない人ための GitHub ランキング - zzzmisa's blog](https://blog.zzzmisa.com/japan-github-ranking/)

## 動かし方

### params

`params.json.sample`の中身を自分の環境変数に書き変えて、ファイル名を`params.json`にしておく。

```
{
  "octokitInfo": {
    "appId": "140258",
    "privateKey": "-----BEGIN RSA PRIVATE KEY-----\nMI...Arc=\n-----END RSA PRIVATE KEY-----\n",
    "oauth": {
      "clientId": "Iv1.129...",
      "clientSecret": "fc6..."
    },
    "installationId": "33617850"
  },
  "output_repogitory_owner": "zzzmisa",
  "output_repository_name": "japan-github-ranking"
}
```

GitHub App を作成し、出力先のレポジトリにインストールしておく。GitHub App には、Contents の Write 権限をつけておく。GitHub App や Installation の設定画面で確認した値を、`octokitInfo`のパラメーターに設定する。

`octokitInfo.privateKey`は、 1 行形式に変えて設定する。

```
% awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' japan-github-ranking-app.2023-xx-xx.private-key.pem > output.txt
```

`output_repository_name`に設定する出力先のレポジトリは、予め作成しておく。

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
