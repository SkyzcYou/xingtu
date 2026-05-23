# Xingtu Console 构建与部署

控制面板镜像仓库：

```text
crpi-b1po1b8mfjqfuj2k.cn-shenzhen.personal.cr.aliyuncs.com/skyzcstack/xing-tu-console
```

## 构建镜像

在仓库根目录执行：

```bash
docker build \
  -f backend/web/Dockerfile \
  -t crpi-b1po1b8mfjqfuj2k.cn-shenzhen.personal.cr.aliyuncs.com/skyzcstack/xing-tu-console:latest \
  .
```

默认构建参数：

```text
VITE_API_BASE_URL=https://api.xingtu.live
VITE_FERRISKEY_BASE_URL=https://trust-api.skyzcstack.space
VITE_FERRISKEY_REALM=xing
VITE_FERRISKEY_CLIENT_ID=xingtu-console
VITE_FERRISKEY_SCOPE=openid profile email
```

如需覆盖：

```bash
docker build \
  -f backend/web/Dockerfile \
  --build-arg VITE_API_BASE_URL=https://api.xingtu.live \
  --build-arg VITE_FERRISKEY_BASE_URL=https://trust-api.skyzcstack.space \
  --build-arg VITE_FERRISKEY_REALM=xing \
  --build-arg VITE_FERRISKEY_CLIENT_ID=xingtu-console \
  -t crpi-b1po1b8mfjqfuj2k.cn-shenzhen.personal.cr.aliyuncs.com/skyzcstack/xing-tu-console:latest \
  .
```

## 推送镜像

```bash
docker login --username=15985428639 crpi-b1po1b8mfjqfuj2k.cn-shenzhen.personal.cr.aliyuncs.com

docker push crpi-b1po1b8mfjqfuj2k.cn-shenzhen.personal.cr.aliyuncs.com/skyzcstack/xing-tu-console:latest
```

## 生产启动

服务器只需要 `backend/web/docker-compose.yml`：

```bash
docker compose -f backend/web/docker-compose.yml up -d
```

默认访问端口：

```text
http://服务器IP:7202
```

## 查看状态

```bash
docker compose -f backend/web/docker-compose.yml ps

docker compose -f backend/web/docker-compose.yml logs -f xingtu-console
```
