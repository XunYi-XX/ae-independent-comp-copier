import hashlib
import importlib.util
from pathlib import Path
import tempfile
import unittest
import urllib.error
import urllib.parse

spec = importlib.util.spec_from_file_location('publisher', Path(__file__).resolve().parents[1]/'scripts/publish_release.py')
publisher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(publisher)


class PublisherTest(unittest.TestCase):
    def test_publish_resume_and_refuse_replacement(self):
        with tempfile.TemporaryDirectory() as folder:
            dist = Path(folder)
            names = ['AE-Independent-Comp-Copier-Setup-v1.0.0.exe', 'AE-Independent-Comp-Copier-v1.0.0-Windows.zip', 'Independent Comp Copier.jsx', 'SHA256SUMS.txt']
            for name in names:
                (dist/name).write_bytes(name.encode())
            state = {'release':None, 'assets':[], 'uploads':0}

            def api(method, endpoint, data=None, binary=False):
                if method == 'GET' and '/tags/' in endpoint:
                    if state['release'] is None:
                        raise urllib.error.HTTPError(endpoint, 404, 'Not Found', {}, None)
                    return state['release']
                if method == 'POST' and endpoint.endswith('/releases'):
                    self.assertEqual(data['target_commitish'], 'commit-sha')
                    state['release'] = {'id':1, 'upload_url':'https://uploads.test/assets{?name}', 'html_url':'https://github.test/release/v1.0.0'}
                    return state['release']
                if method == 'GET' and '/assets?' in endpoint:
                    return state['assets']
                if binary:
                    name = urllib.parse.parse_qs(urllib.parse.urlparse(endpoint).query)['name'][0]
                    asset = {'name':name, 'size':len(data), 'digest':'sha256:'+hashlib.sha256(data).hexdigest()}
                    state['assets'].append(asset); state['uploads'] += 1
                    return asset
                self.fail((method,endpoint))

            publisher.publish(api,'owner/repo','commit-sha',dist)
            self.assertEqual(state['uploads'],4)
            publisher.publish(api,'owner/repo','commit-sha',dist)
            self.assertEqual(state['uploads'],4)
            (dist/names[0]).write_bytes(b'changed installer')
            with self.assertRaisesRegex(RuntimeError,'refusing overwrite'):
                publisher.publish(api,'owner/repo','commit-sha',dist)


if __name__ == '__main__':
    unittest.main()
