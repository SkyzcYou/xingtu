# Xingtu API Docker 构建与推送

镜像仓库：

```text
crpi-b1po1b8mfjqfuj2k.cn-shenzhen.personal.cr.aliyuncs.com/skyzcstack/xing-tu-api
```

## 1. 登录阿里云 ACR

```bash
docker login --username=15985428639 crpi-b1po1b8mfjqfuj2k.cn-shenzhen.personal.cr.aliyuncs.com
```

## 2. 在仓库根目录构建镜像

```bash
docker build \
  -f backend/Dockerfile \
  -t crpi-b1po1b8mfjqfuj2k.cn-shenzhen.personal.cr.aliyuncs.com/skyzcstack/xing-tu-api:latest \
  backend
```

## 3. 推送镜像

```bash
docker push crpi-b1po1b8mfjqfuj2k.cn-shenzhen.personal.cr.aliyuncs.com/skyzcstack/xing-tu-api:latest
```

## 4. 可选：验证远端镜像

```bash
docker manifest inspect crpi-b1po1b8mfjqfuj2k.cn-shenzhen.personal.cr.aliyuncs.com/skyzcstack/xing-tu-api:latest >/dev/null
```

## 5. 服务器启动

服务器只需要 `backend/docker-compose.yml` 一个文件即可。

```bash
docker compose up -d
```

查看后端日志：

```bash
docker compose logs -f xingtu-api
```
