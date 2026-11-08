# 更新日志

## 项目说明

Independent Comp Copier 是用于在 After Effects 中复制合成及其依赖的 ScriptUI 面板。[安装和使用说明](README.md)

## 版本记录

### [v1.0.1](https://github.com/XunYi-XX/ae-independent-comp-copier/tree/v1.0.1)（2026-11-08）

- 默认复用原合成的图片、视频和音频素材。需要隔离素材时，可勾选「独立复制素材项目」。
- 主合成、嵌套合成和表达式引用的控制合成分别复制到各自原件所在的目录，通过名称区分副本。
- 复制完成后保留项目面板原来的选择。默认模式无需新建文件夹，面板列出新合成的名称。

### [v1.0.0](https://github.com/XunYi-XX/ae-independent-comp-copier/releases/tag/v1.0.0)（2026-10-24）

- 首次发布中文 ScriptUI 面板，支持批量创建独立的主合成和嵌套合成副本。
- 支持静态 `comp()` 和 `footage()` 引用重定向，并在复制前报告无法安全改写的动态引用。
- 提供内置面板的 Windows 安装包，支持检测 AE、安装、升级备份与卸载。原版发布说明及测试记录见上方版本链接。
