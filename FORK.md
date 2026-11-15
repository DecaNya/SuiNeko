# Sui Harness Desktop

基于 DeepSeek Harness 0.2.2-rc.3 的 Sui Harness 桌面客户端分支。

- 上游：https://github.com/deepseek-ai/deepseek-harness
- Fork：https://github.com/Full-Sui/deepseek-harness
- License：MIT
- 首版目标：Windows x64，unsigned

## 当前品牌改造

| 项目 | 值 |
|---|---|
| 产品名 | Sui Harness |
| appId | cc.odn.sui.harness |
| 安装包名 | `sui-harness-<version>-win-x64-unsigned.exe` |
| 应用图标 | New API 站点的 Sui Harness logo |
| 欢迎页字标 | `Sui Harness` |
| 安装器品牌图 | Sui Harness logo |
| 桌面菜单/欢迎页本地化 | `Sui Harness` |

## Windows 构建

本地 Windows：

```powershell
corepack enable
pnpm install --frozen-lockfile
$env:DSH_DESKTOP_APP_ID = "cc.odn.sui.harness"
$env:DSH_DESKTOP_UNSIGNED = "1"
pnpm run package:desktop:win:x64:unsigned
```

产物：

```text
apps/desktop/.desktop-build/targets/win-x64/unsigned-artifacts/
```

GitHub Actions：

- `.github/workflows/build-sui-harness-windows.yml`
- 手动触发 `Build Sui Harness Windows`
- 下载 artifact `sui-harness-windows-unsigned`

## 下一步

1. 接 Sui Harness Provider（`https://suiapi.odn.cc/v1`）
2. 替换官方 DeepSeek 账号登录为 BFF / 企业 SSO
3. 关闭官方遥测和更新服务
4. 换欢迎页文案与工作区默认配置
5. Windows 签名与自动更新
