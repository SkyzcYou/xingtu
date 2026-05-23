# Trust 新增 backend/web Console 管理员指导

本文记录如何在 Trust IAM 中为 `backend/web` 管理控制台新增管理员账号。

## 前提

- backend/web 使用的 OIDC client 是 `xingtu-console`。
- backend/web 的管理员角色名是 `admin`。
- backend/web 运行或构建时必须设置：

```env
VITE_ADMIN_REQUIRED_ROLE=admin
```

- Trust IAM 中已存在：
  - Realm：`xing`
  - Client：`xingtu-console`
  - Client Role：`xingtu-console/admin`
  - Client Scope：`roles`
  - `roles` scope 中的 client-role mapper：
    - Name：`resource_access`
    - Type：`oidc-usermodel-client-role-mapper`
    - Client ID：`xingtu-console`
    - Token claim name：`resource_access.xingtu-console.roles`
    - Add to ID token：开启
    - Add to access token：开启
    - Add to userinfo：开启

## 重要注意事项

Trust Console 后台管理员登录 realm 是 `master`，不是 `xing`。

不要直接在下面这个地址登录后台：

```text
https://trust-console.skyzcstack.space/realms/xing/authentication/portal
```

正确流程是：

1. 先登录 `master` realm 的 Trust Console。
2. 登录后在控制台左上角 realm 切换器中切到 `xing`。
3. 再管理 `xing` realm 下的用户、client、role。

如果后台会话过期后自动跳到了 `/realms/xing/authentication/portal`，需要回到 `master` 控制台重新登录，再切回 `xing`。

## 新增管理员步骤

### 1. 登录 Trust Console

使用管理员账号进入 Trust Console，并确认当前是 `master` 登录后的控制台会话。

### 2. 切换到 xing realm

在左上角 realm 切换器中选择：

```text
xing
```

页面顶部应显示：

```text
realm: xing
```

### 3. 创建或找到目标用户

进入：

```text
Users
```

如果用户不存在，创建用户并完成必要的登录凭据配置。

如果用户已存在，打开该用户详情页。

### 4. 分配 console 管理员角色

在用户详情中进入角色映射/角色分配页面，将以下 client role 分配给用户：

```text
Client: xingtu-console
Role: admin
```

目标效果是：该用户拥有 `xingtu-console/admin` client role。

### 5. 确认 client scope 和 mapper 配置

进入：

```text
Clients -> xingtu-console -> Client Scopes
```

确认 `Assigned Scopes` 中包含：

```text
roles
```

再进入：

```text
Client Scopes -> roles -> Protocol Mappers
```

确认至少存在以下 mapper：

```text
realm_access     oidc-usermodel-realm-role-mapper
resource_access  oidc-usermodel-client-role-mapper
```

其中 `resource_access` mapper 需要输出：

```json
{
  "resource_access": {
    "xingtu-console": {
      "roles": ["admin"]
    }
  }
}
```

## 验证步骤

### 1. 重新登录 backend/web

已有 token 不会自动更新。分配角色后，目标用户必须退出并重新登录 backend/web。

访问：

```text
http://localhost:5175/auth/profile
```

或对应部署环境的：

```text
/auth/profile
```

### 2. 检查个人资料页

在 backend/web 的个人资料页中，角色区域应显示：

```text
admin
```

该页面说明角色来源是：

```text
realm_access 和 xingtu-console client roles
```

### 3. 验证非管理员访问被拒绝

使用未分配 `xingtu-console/admin` 的账号重新登录 backend/web。

预期行为：

- 不能访问 `/profile`、`/sync`、`/settings` 等后台页面。
- 应跳转到：

```text
/auth/forbidden
```

并显示无管理员权限提示。

## 常见问题

### 用户已经分配 admin，但 backend/web 仍看不到角色

检查顺序：

1. 用户是否重新登录 backend/web，确保 token 是新签发的。
2. 用户是否分配的是 `xingtu-console/admin`，而不是其它 client 或 realm 下的 `admin`。
3. `xingtu-console -> Client Scopes` 是否包含 `roles`。
4. `roles -> Protocol Mappers` 是否存在 `resource_access` client-role mapper。
5. backend/web 是否设置了：

```env
VITE_ADMIN_REQUIRED_ROLE=admin
```

### 非管理员仍然能进入 backend/web

优先检查 backend/web 的运行/构建环境是否缺少：

```env
VITE_ADMIN_REQUIRED_ROLE=admin
```

如果该变量为空，backend/web 前端代码会允许所有已登录用户进入控制台。

### 只改 Trust IAM 是否足够

不够。Trust IAM 负责把角色发到 token；backend/web 还必须配置 `VITE_ADMIN_REQUIRED_ROLE=admin` 才会拒绝非管理员。

如果未来 backend/web 接入真实管理员 API，后端 API 也必须校验 token 中的管理员角色，不能只依赖前端页面门禁。
