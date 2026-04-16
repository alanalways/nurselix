# 藍新金流（NewebPay）× Zeabur 設定指南

本文件說明如何把已經在藍新後台註冊、通過審核的商店串接到 Nurslix 的 Zeabur 部署。

---

## 1. 先在藍新後台取得三把金鑰

登入 **正式站** 商店後台 → 「會員中心」→「商店管理」→「商店資料設定」：

| 欄位 | 用途 | 對應的 Zeabur 環境變數 |
|---|---|---|
| MerchantID（商店代號） | 交易身份識別 | `NEWEBPAY_MERCHANT_ID` |
| HashKey（加密用 Key） | 建立 AES 加密字串 | `NEWEBPAY_HASH_KEY` |
| HashIV（加密用 IV） | 搭配 Key 進行 AES | `NEWEBPAY_HASH_IV` |

> 測試站與正式站是**兩組完全不同**的金鑰。正式上線一定要換成正式站那組，不要複製到測試站。

---

## 2. 在藍新後台設定三個 URL

一樣在「商店資料設定」頁面下方：

| 藍新欄位 | 設定值（把 `YOUR_DOMAIN` 換成你的 Zeabur 網域） |
|---|---|
| 支付完成返回網址 `ReturnURL` | `https://YOUR_DOMAIN/api/payment/newebpay/return` |
| 支付通知網址 `NotifyURL` | `https://YOUR_DOMAIN/api/payment/newebpay/notify` |
| 商店取消後返回網址 `CustomerURL` | `https://YOUR_DOMAIN/pricing?cancelled=1` |

- **`NotifyURL` 必須是公開可訪問的 HTTPS**（Zeabur 預設網域即可）。這支 API 是藍新背景打來更新訂單狀態的，**使用者看不到**。
- **`ReturnURL`** 是使用者付款成功後瀏覽器跳回的頁面。
- 兩支網址都要能接收 `POST`，後端要自行驗證加密參數。

---

## 3. 在 Zeabur 加上環境變數

1. 進入 Zeabur Dashboard → 選到 Nurslix 專案 → 點進 Next.js 服務
2. 左側選單點 **Variables**
3. 依序新增以下變數（值填你從藍新後台複製出來的）：

```env
# 藍新金流（NewebPay）
NEWEBPAY_MERCHANT_ID=MS1234567
NEWEBPAY_HASH_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NEWEBPAY_HASH_IV=xxxxxxxxxxxxxxxx
NEWEBPAY_API_URL=https://core.newebpay.com/MPG/mpg_gateway
NEWEBPAY_VERSION=2.0

# 對外網址（用你的 Zeabur 或自訂網域）
NEXT_PUBLIC_SITE_URL=https://YOUR_DOMAIN
NEWEBPAY_RETURN_URL=https://YOUR_DOMAIN/api/payment/newebpay/return
NEWEBPAY_NOTIFY_URL=https://YOUR_DOMAIN/api/payment/newebpay/notify
NEWEBPAY_CUSTOMER_URL=https://YOUR_DOMAIN/pricing?cancelled=1
```

4. 存檔後，Zeabur 會自動觸發一次 redeploy。

> **測試站 API URL** 是 `https://ccore.newebpay.com/MPG/mpg_gateway`（多一個 c）。上線前務必換成上面的正式 URL。

---

## 4. 安全性提醒

- `HashKey` / `HashIV` **絕對不可以**進到 `NEXT_PUBLIC_*` 變數，也不要 commit 到 git。目前專案已經把金鑰走 server-only。
- `NotifyURL` 的驗證邏輯一定要比對 `TradeSha`，否則任何人都可以偽造交易成功通知。
- 正式上線建議再加一層 IP 白名單（藍新會提供來源 IP 清單）。

---

## 5. 驗證是否設定成功

1. 部署完成後開瀏覽器：`https://YOUR_DOMAIN/pricing`
2. 選一個方案 → 點「立即訂閱」
3. 會跳轉到藍新付款頁，網址應包含 `core.newebpay.com`
4. 用測試卡號（藍新文件提供）完成付款
5. 回到 Nurslix 應該看到訂閱狀態已更新；`Order` 資料表中 `status=paid`、`paymentRef` 有值即代表 Notify 成功
