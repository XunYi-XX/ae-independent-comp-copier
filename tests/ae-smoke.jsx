/* Run via a generated ASCII-path wrapper that sets IIC_TEST_ROOT / IIC_TEST_REPORT / IIC_TEST_IMAGE. */
(function () {
    $.evalFile(new File(IIC_TEST_ROOT + '/src/lex.js'));
    $.evalFile(new File(IIC_TEST_ROOT + '/src/engine.jsxinc'));
    var p = app.project, baseline = {}, selection = [], beforeCount = p.numItems, projectFile = p.file ? p.file.fsName : null;
    var result = {success:false, assertions:[], projectFile:projectFile, dirtyBefore:p.dirty}, stamp = '__IIC_TEST_' + new Date().getTime(), openedGroup = false;
    for (var i = 1; i <= p.numItems; i++) {var item = p.item(i); baseline['$'+item.id] = item.name; if (item.selected) selection.push(item);}
    function assert(ok, message) {if (!ok) throw Error(message); result.assertions.push(message);}
    function json(v) {if(v===null||v===undefined)return 'null';if(typeof v==='string')return IICLex.quote(v);if(typeof v==='number')return isFinite(v)?String(v):'null';if(typeof v==='boolean')return String(v);var a=[],i;if(v instanceof Array){for(i=0;i<v.length;i++)a.push(json(v[i]));return '['+a.join(',')+']';}for(i in v)if(v.hasOwnProperty(i))a.push(IICLex.quote(i)+':'+json(v[i]));return '{'+a.join(',')+'}';}
    function addComp(name, folder) {var c = p.items.addComp(name, 64, 64, 1, 3, 25); c.parentFolder = folder; return c;}
    function findCopy(report, old, rootIndex) {
        var found = [];
        for (var i = 0; i < report.mapping.length; i++) if (report.mapping[i].sourceId === old.id) found.push(report.mapping[i].copyId);
        var id = found[rootIndex || 0];
        for (var i = 1; i <= p.numItems; i++) if (p.item(i).id === id) return p.item(i);
        throw Error('Missing copy for '+old.name);
    }
    function evaluate(prop) {var value = prop.valueAtTime(1, false); if (prop.expressionError) throw Error(prop.expressionError); return value;}
    try {
        app.beginUndoGroup('独立合成复制器：临时测试夹具'); openedGroup = true;
        var folder = p.items.addFolder(stamp), ctrl = addComp(stamp + '_控制"器', folder), child = addComp(stamp + '_子合成', folder), root = addComp(stamp + '_来源', folder);
        var ctrlNull = ctrl.layers.addNull(); ctrlNull.name = 'CTRL';
        var amount = ctrlNull.property('ADBE Effect Parade').addProperty('ADBE Slider Control'); amount.name = 'Amount'; amount.property(1).setValue(25);
        var text = child.layers.addText('ORIGINAL'); text.name = '文字';
        text.property('ADBE Transform Group').property('ADBE Position').expression = '[thisComp.width/2, thisComp.height/2]';
        var input = p.importFile(new ImportOptions(new File(IIC_TEST_IMAGE))); input.parentFolder = folder; input.name = stamp + '_image.png';
        var movie = p.importFile(new ImportOptions(new File(IIC_TEST_VIDEO))); movie.parentFolder = folder; movie.name = stamp + '_clip.mp4';
        movie.mainSource.conformFrameRate = 12.5; movie.mainSource.loop = 2;
        var movieLayer = root.layers.add(movie); movieLayer.name = 'Video';
        var a = root.layers.add(child); a.name = 'A'; var b = root.layers.add(child); b.name = 'B';
        a.startTime = 0.1; a.stretch = 80; a.inPoint = 0.2; a.outPoint = 2.0;
        var parent = root.layers.addNull(); parent.name = 'Local parent'; a.parent = parent;
        var image = root.layers.add(input); image.name = 'Photo';
        var matte = root.layers.addShape(); matte.name = 'Matte'; image.setTrackMatte(matte, TrackMatteType.ALPHA); image.locked = true;
        var opacity = b.property('ADBE Transform Group').property('ADBE Opacity');
        opacity.expression = 'comp(' + IICLex.quote(ctrl.name) + ').layer("CTRL").effect("Amount")(1)';
        var disabled = parent.property('ADBE Transform Group').property('ADBE Opacity');
        disabled.expression = 'comp(' + IICLex.quote(ctrl.name) + ').width'; disabled.expressionEnabled = false;
        var rotation = parent.property('ADBE Transform Group').property('ADBE Rotate Z');
        rotation.expression = 'footage(' + IICLex.quote(input.name) + ').width';
        var scale = parent.property('ADBE Transform Group').property('ADBE Scale'); scale.setValueAtTime(0,[100,100]); scale.setValueAtTime(2,[80,80]);
        var originalExpr = opacity.expression, originalText = text.property('ADBE Text Properties').property('ADBE Text Document').value.text;
        app.endUndoGroup(); openedGroup = false;
        var plan = IICEngine.analyze(p, root, {copyMedia:true});
        assert(plan.issues.length === 0, 'Native dependency analysis passes: ' + plan.issues.join(';'));
        assert(plan.comps.length === 3, 'Expression-only external controller included');
        addComp(stamp + '_副本_1', folder);
        var report = IICEngine.execute(plan, {name:stamp+'_副本',count:2});
        assert(report.roots.length === 2, 'Two independent copies created');
        assert(report.roots[0].name === stamp + '_副本_1_2', 'Existing composition name collision avoided');
        var root1 = report.roots[0], root2 = report.roots[1], ctrl1 = findCopy(report,ctrl,0), ctrl2 = findCopy(report,ctrl,1), child1 = findCopy(report,child,0), child2 = findCopy(report,child,1);
        assert(root1.layer('A').source === root1.layer('B').source && root1.layer('A').source !== child, 'Repeated nested source copied once per copy');
        assert(root1.layer('A').source !== root2.layer('A').source, 'Different copies do not share nested compositions');
        assert(root1.layer('A').startTime === a.startTime && root1.layer('A').inPoint === a.inPoint && root1.layer('A').outPoint === a.outPoint && root1.layer('A').stretch === a.stretch, 'Layer timing and stretch preserved');
        assert(root1.layer('A').parent === root1.layer('Local parent'), 'Parent links stay inside each duplicate');
        assert(root1.layer('Photo').locked && root1.layer('Photo').trackMatteLayer === root1.layer('Matte'), 'Locked media and explicit track matte preserved');
        var movie1 = findCopy(report,movie,0);
        assert(movie1.mainSource.conformFrameRate === 12.5 && movie1.mainSource.loop === 2 && Math.abs(movie1.duration-movie.duration)<0.0001 && root1.layer('Video').source === movie1, 'Video frame-rate interpretation and looping preserved');
        assert(root1.layer('Local parent').property('ADBE Transform Group').property('ADBE Scale').numKeys === 2, 'Animation keyframes preserved');
        assert(!root1.layer('Local parent').property('ADBE Transform Group').property('ADBE Opacity').expressionEnabled, 'Disabled expressions remain disabled');
        assert(evaluate(root1.layer('B').property('ADBE Transform Group').property('ADBE Opacity')) === 25, 'Rewritten controller expression evaluates in AE');
        ctrl1.layer('CTRL').property('ADBE Effect Parade').property('Amount').property(1).setValue(75);
        assert(evaluate(root1.layer('B').property('ADBE Transform Group').property('ADBE Opacity')) === 75 && evaluate(root2.layer('B').property('ADBE Transform Group').property('ADBE Opacity')) === 25 && evaluate(opacity) === 25, 'Editing copied controller affects only its own copy');
        var copiedText = child1.layer('文字').property('ADBE Text Properties').property('ADBE Text Document'); var document = copiedText.value; document.text = 'COPY'; copiedText.setValue(document);
        assert(copiedText.value.text === 'COPY' && child2.layer('文字').property('ADBE Text Properties').property('ADBE Text Document').value.text === 'ORIGINAL' && originalText === text.property('ADBE Text Properties').property('ADBE Text Document').value.text, 'Text edits are independent from original and sibling copy');
        var media1 = findCopy(report,input,0), media2 = findCopy(report,input,1);
        assert(media1 !== input && media2 !== input && media1 !== media2 && root1.layer('Photo').source === media1, 'Footage projects are independently cloned and linked');
        assert(root1.layer('Local parent').property('ADBE Transform Group').property('ADBE Rotate Z').expression.indexOf(IICLex.quote(media1.name)) >= 0, 'footage() expressions point to independent media');
        media1.replaceWithSolid([1,0,0], 'replacement', 64,64,1);
        assert(input.file !== null && media2.file !== null, 'Replacing copied footage leaves original and sibling untouched');
        assert(opacity.expression === originalExpr, 'Original expression text remains unchanged');
        var sharedPlan = IICEngine.analyze(p,root,{copyMedia:false});
        var shared = IICEngine.execute(sharedPlan,{name:stamp+'_共享素材',count:1});
        assert(shared.roots[0].layer('Photo').source === input && shared.warnings.length === 1 && shared.roots[0].layer('A').source !== child, 'Optional shared-media mode keeps independent compositions and reports scope');
        var dynamic = addComp(stamp+'_动态',folder); var dynLayer = dynamic.layers.addNull(); dynLayer.property('ADBE Transform Group').property('ADBE Opacity').expression = 'var name='+IICLex.quote(ctrl.name)+'; comp(name).width;';
        assert(IICEngine.analyze(p,dynamic,{copyMedia:true}).issues.length > 0, 'Dynamic references are blocked before duplication');
        var duplicateName = addComp(ctrl.name,folder);
        assert(IICEngine.analyze(p,root,{copyMedia:true}).issues.length > 0, 'Ambiguous expression target names are blocked'); duplicateName.remove();
        var fail = addComp(stamp+'_正常名称',folder); var failLayer = fail.layers.addNull();
        failLayer.property('ADBE Transform Group').property('ADBE Opacity').expression = 'if (thisComp.name.indexOf("FAIL_2") >= 0) {throw new Error("intentional failure");} value;';
        var failPlan = IICEngine.analyze(p,fail,{copyMedia:true}); assert(failPlan.issues.length === 0,'Failure fixture is valid before duplication');
        var countBeforeFailure = p.numItems, threw = false;
        try {IICEngine.execute(failPlan,{name:stamp+'_FAIL',count:2});} catch (expected) {threw = true; result.rollbackMessage = String(expected);}
        assert(threw && p.numItems === countBeforeFailure, 'Second-copy expression failure rolls back the entire batch');
        result.success = true;
    } catch (error) {result.error = String(error); result.line = error.line;}
    finally {
        if (openedGroup) app.endUndoGroup();
        for (var i = p.numItems; i >= 1; i--) {var item = p.item(i); if (!baseline['$'+item.id]) {try {item.remove();} catch (_) {}}}
        for (var i = 1; i <= p.numItems; i++) p.item(i).selected = false;
        for (var i = 0; i < selection.length; i++) {try {selection[i].selected = true;} catch (_) {}}
        result.cleaned = p.numItems === beforeCount;
        result.originalItemsUnchanged = true;
        for (var i = 1; i <= p.numItems; i++) {var item = p.item(i); if (baseline['$'+item.id] !== item.name) result.originalItemsUnchanged = false;}
        result.projectUnchanged = (p.file ? p.file.fsName : null) === projectFile;
        result.dirtyAfter = p.dirty;
        result.success = result.success && result.cleaned && result.originalItemsUnchanged && result.projectUnchanged;
        var f = new File(IIC_TEST_REPORT); f.encoding='UTF-8'; if(f.open('w')) {f.write(json(result)); f.close();}
    }
})();
