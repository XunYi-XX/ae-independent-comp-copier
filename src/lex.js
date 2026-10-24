/* ES3-compatible expression reference scanner. No eval, no dependencies. */
var IICLex = (function () {
    function quote(s) {
        return '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')
            .replace(/\r/g, '\\r').replace(/\n/g, '\\n').replace(/\t/g, '\\t')
            .replace(/\x08/g, '\\b').replace(/\x0c/g, '\\f')
            .replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029') + '"';
    }
    function decode(s) {
        var out = '', i, c, n, hex, escapes = {n:'\n', r:'\r', t:'\t', b:'\b', f:'\f', v:'\x0b', '0':'\x00'};
        for (i = 1; i < s.length - 1; i++) {
            c = s.charAt(i);
            if (c !== '\\') {out += c; continue;}
            n = s.charAt(++i);
            if (n === '\r' || n === '\n') {if (n === '\r' && s.charAt(i + 1) === '\n') i++; continue;}
            if (n === 'u' || n === 'x') {
                hex = s.substr(i + 1, n === 'u' ? 4 : 2);
                if (!/^[0-9a-f]+$/i.test(hex) || hex.length !== (n === 'u' ? 4 : 2)) throw Error('字符串转义无效');
                out += String.fromCharCode(parseInt(hex, 16)); i += hex.length;
            } else if (/[1-7]/.test(n) || (n === '0' && /[0-9]/.test(s.charAt(i + 1)))) {
                throw Error('不支持旧式八进制字符串转义，请改用 Unicode 转义');
            } else out += escapes.hasOwnProperty(n) ? escapes[n] : n;
        }
        return out;
    }
    function scan(source) {
        var tokens = [], issues = [], refs = [], parens = [], braces = [], i = 0, start, c, next, end, prev, regexAllowed, cls;
        function token(type, from, to, value) {tokens.push({type:type, start:from, end:to, value:value});}
        while (i < source.length) {
            c = source.charAt(i); next = source.charAt(i + 1); start = i;
            if (/\s/.test(c)) {i++; continue;}
            if (c === '/' && next === '/') {i += 2; while (i < source.length && !/[\r\n]/.test(source.charAt(i))) i++; continue;}
            if (c === '/' && next === '*') {
                end = source.indexOf('*/', i + 2);
                if (end < 0) {issues.push('块注释未闭合'); break;}
                i = end + 2; continue;
            }
            if (c === '"' || c === "'") {
                i++; end = -1;
                while (i < source.length) {
                    if (source.charAt(i) === '\\') {i += 2; continue;}
                    if (source.charAt(i) === c) {end = ++i; break;}
                    i++;
                }
                if (end < 0) {issues.push('字符串未闭合'); break;}
                try {token('str', start, end, decode(source.substring(start, end)));}
                catch (error) {issues.push(String(error));}
                continue;
            }
            if (c === '`') {issues.push('暂不支持模板字符串，请将合成引用改成 comp("名称")'); break;}
            if (/[A-Za-z_$\u0080-\uffff]/.test(c)) {
                i++; while (i < source.length && /[A-Za-z0-9_$\u0080-\uffff]/.test(source.charAt(i))) i++;
                token('id', start, i, source.substring(start, i)); continue;
            }
            if (/[0-9]/.test(c)) {
                i++; while (i < source.length && /[A-Za-z0-9_.]/.test(source.charAt(i))) i++;
                token('num', start, i, source.substring(start, i)); continue;
            }
            if (c === '/') {
                prev = tokens.length ? tokens[tokens.length - 1] : null;
                regexAllowed = !prev || prev.endsStatement || (prev.type === 'punc' && /[({\[,:;=!?&|+*%^~<>]/.test(prev.value)) ||
                    (prev.type === 'id' && /^(return|throw|case|delete|void|typeof|instanceof|in|yield|else|do)$/.test(prev.value));
                if (regexAllowed) {
                    i++; cls = false; end = -1;
                    while (i < source.length) {
                        c = source.charAt(i);
                        if (c === '\\') {i += 2; continue;}
                        if (c === '[') cls = true;
                        if (c === ']') cls = false;
                        if (c === '/' && !cls) {i++; while (/[a-z]/i.test(source.charAt(i)) && i < source.length) i++; end = i; break;}
                        if (/[\r\n]/.test(c)) break;
                        i++;
                    }
                    if (end < 0) {issues.push('无法解析正则表达式'); break;}
                    token('regex', start, end, ''); continue;
                }
            }
            prev = tokens.length ? tokens[tokens.length - 1] : null;
            if (c === '(') parens.push(!!(prev && prev.type === 'id' && /^(if|while|for|with|switch|catch)$/.test(prev.value)));
            if (c === '{') braces.push(!prev || prev.endsStatement || prev.value === ')' || prev.value === ';' || prev.value === 'else' || prev.value === 'try' || prev.value === 'finally' || prev.value === 'do');
            token('punc', i, i + 1, c);
            if (c === ')') tokens[tokens.length - 1].endsStatement = parens.length ? parens.pop() : false;
            if (c === '}') tokens[tokens.length - 1].endsStatement = braces.length ? braces.pop() : false;
            i++;
        }
        for (i = 0; i < tokens.length; i++) {
            var t = tokens[i], a = tokens[i + 1], b = tokens[i + 2], d = tokens[i + 3];
            prev = i ? tokens[i - 1] : null;
            if (t.type !== 'id' || (prev && prev.value === '.')) continue;
            if ((t.value === 'eval' || t.value === 'Function' || t.value === 'evalFile') && a && a.value === '(') {
                issues.push('动态执行代码无法自动独立化'); continue;
            }
            if (t.value !== 'comp' && t.value !== 'footage') continue;
            if (!a || a.value !== '(' || !b || b.type !== 'str' || !d || d.value !== ')') {
                issues.push(t.value + ' 使用动态名称或间接调用，请改为 ' + t.value + '("固定名称")'); continue;
            }
            refs.push({kind:t.value, name:b.value, start:b.start, end:b.end});
        }
        return {refs:refs, issues:issues};
    }
    function rewrite(source, refs, resolve) {
        var out = source, i, ref, name;
        for (i = refs.length - 1; i >= 0; i--) {
            ref = refs[i]; name = resolve(ref);
            if (name !== null && name !== undefined) out = out.substring(0, ref.start) + quote(name) + out.substring(ref.end);
        }
        return out;
    }
    function unique(base, used) {
        var name = base, n = 2;
        while (used['$' + name]) name = base + '_' + n++;
        used['$' + name] = true; return name;
    }
    return {scan:scan, rewrite:rewrite, quote:quote, unique:unique};
})();
