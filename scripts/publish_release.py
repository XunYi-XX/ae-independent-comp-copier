"""Publish validated local build artifacts using the workflow's short-lived GITHUB_TOKEN."""
import hashlib
import json
import os
from pathlib import Path
import urllib.error
import urllib.parse
import urllib.request


def publish(api, repo, sha, dist):
    tag = 'v1.0.1'
    prefix = '/repos/' + repo
    try:
        release = api('GET', prefix + '/releases/tags/' + tag)
    except urllib.error.HTTPError as error:
        if error.code != 404:
            raise
        release = api('POST', prefix + '/releases', {
            'tag_name': tag, 'target_commitish': sha,
            'name': 'AE 独立合成复制器 ' + tag,
            'body': '独立 Windows 安装包：自动检测 AE，内置插件文件，支持安装、更新、旧版本备份和卸载。\n\n'
                    '下载 Setup EXE 后双击安装，或下载 Windows ZIP 获取安装包、JSX 和说明。安装不会关闭 AE。\n\n'
                    '副本与对应原合成同目录，默认复用原素材项目。复制完成后保留项目面板的选择。\n\n'
                    '嵌套合成和静态 comp() 引用独立；footage() 引用随素材选项处理。支持范围详见 README。',
            'draft': False, 'prerelease': False,
        })
    existing = {asset['name']: asset for asset in api('GET', prefix + '/releases/' + str(release['id']) + '/assets?per_page=100')}
    names = ['AE-Independent-Comp-Copier-Setup-' + tag + '.exe', 'AE-Independent-Comp-Copier-' + tag + '-Windows.zip',
             'Independent Comp Copier.jsx', 'SHA256SUMS.txt']
    for name in names:
        data = (dist / name).read_bytes()
        digest = 'sha256:' + hashlib.sha256(data).hexdigest()
        if name in existing:
            if existing[name].get('digest') == digest:
                print('Already published, identical: ' + name)
                continue
            raise RuntimeError('Release asset exists with different or unknown digest; refusing overwrite: ' + name)
        url = release['upload_url'].split('{', 1)[0] + '?' + urllib.parse.urlencode({'name': name})
        asset = api('POST', url, data, binary=True)
        if asset['size'] != len(data):
            raise RuntimeError('Uploaded size mismatch: ' + name)
        print('Published: ' + name)
    print('Release: ' + release['html_url'])


def main():
    token = os.environ['GITHUB_TOKEN']
    repo = os.environ['GITHUB_REPOSITORY']
    sha = os.environ['GITHUB_SHA']
    api_root = os.environ.get('GITHUB_API_URL', 'https://api.github.com')

    def api(method, endpoint, data=None, binary=False):
        url = endpoint if endpoint.startswith('https://') else api_root + endpoint
        body = data if binary else (json.dumps(data, ensure_ascii=False).encode('utf-8') if data is not None else None)
        request = urllib.request.Request(url, data=body, method=method, headers={
            'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'Independent-Comp-Copier-Release',
            'Content-Type': 'application/octet-stream' if binary else 'application/json',
        })
        with urllib.request.urlopen(request, timeout=120) as response:
            return json.load(response)

    publish(api, repo, sha, Path(__file__).resolve().parents[1] / 'dist')


if __name__ == '__main__':
    main()
