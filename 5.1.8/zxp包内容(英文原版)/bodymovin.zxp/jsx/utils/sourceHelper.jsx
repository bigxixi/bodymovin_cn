/*jslint vars: true , plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global layerElement, bm_generalUtils, bm_eventDispatcher, bm_renderManager, bm_compsManager, File, app*/
var bm_sourceHelper = (function () {
    'use strict';
    var compSources = [], imageSources = [], fonts = [], currentExportingImage, destinationPath, assetsArray, folder, helperComp, currentCompID, originalNamesFlag, imageCount = 0, imageName = 0;

    function checkCompSource(item) {
        var arr = compSources;
        var i = 0, len = arr.length, isRendered = false;
        while (i < len) {
            if (arr[i].source === item.source) {
                isRendered = true;
                break;
            }
            i += 1;
        }
        if (isRendered) {
            return arr[i].id;
        }
        arr.push({
            source: item.source
        });
        return false;
    }
    
    function checkImageSource(item) {
        var arr = imageSources;
        var i = 0, len = arr.length, isRendered = false;
        while (i < len) {
            if (arr[i].source === item.source) {
                return arr[i].id;
            }
            i += 1;
        }
        arr.push({
            source: item.source,
            width: item.source.width,
            height: item.source.height,
            source_name: item.source.name,
            name: item.name,
            id: 'image_' + imageCount
        });
        imageCount += 1;
        return arr[arr.length - 1].id;
    }
    
    function setCompSourceId(source, id) {
        var i = 0, len = compSources.length;
        while (i < len) {
            if (compSources[i].source === source) {
                compSources[i].id = id;
            }
            i += 1;
        }
    }

    var reservedChars = ['/','?','<','>','\\',':','*','|','"','\''];
    function isReserverChar(charString){
        var i = 0, len = reservedChars.length;
        while( i < len) {
            if(reservedChars[i] === charString){
                return true;
            }
            i += 1;
        }
        return false
    }

    //                  A-Z      - .    0 - 9     _      a-z
    var validRanges = [[65,90],[45,46],[48,57],[95,95],[97,122]]

    function isValidChar(charCode) {
        var i = 0, len = validRanges.length;
        while(i < len) {
            if(charCode >= validRanges[i][0] && charCode <= validRanges[i][1]){
                return true
            }
            i += 1;
        }
        return false
    }

    function checkSanitizedNameExists(name) {
        var i = 0, len = assetsArray.length;
        while (i < len) {
            if(assetsArray[i].p === name) {
                return true
            }
            i += 1;
        }
        return false
    }

    function incrementSanizitedName(name) {
        return name + '_' + imageName++
    }

    function formatImageName(name) {
        var sanitizedName = '';
        var totalChars = name.lastIndexOf('.');
        if(totalChars < 0){
            totalChars = name.length;
        }
        var i;
        for(i = 0; i < totalChars; i += 1) {
            /*var newChar = String.fromCharCode(name.charCodeAt(i) % (2 << 7))
            if(!isReserverChar(newChar)){
                sanitizedName += newChar
            }*/
            var charCode = name.charCodeAt(i)
            if(isValidChar(charCode)) {
                sanitizedName += name.substr(i,1)
            } else {
                sanitizedName += '_'
            }
            if(checkSanitizedNameExists(sanitizedName + '.png')){
                sanitizedName = incrementSanizitedName(sanitizedName)
            }
        }
        return sanitizedName + '.png';
    }
    
    function saveNextImage() {
        if (bm_compsManager.cancelled) {
            return;
        }
        if (currentExportingImage === imageSources.length) {
            bm_renderManager.imagesReady();
            return;
        }
        var currentSourceData = imageSources[currentExportingImage];
        bm_eventDispatcher.sendEvent('bm:render:update', {type: 'update', message: 'Exporting image: ' + currentSourceData.name, compId: currentCompID, progress: currentExportingImage / imageSources.length});
        var currentSource = currentSourceData.source;
        var imageName = originalNamesFlag ? formatImageName(currentSourceData.source_name) : 'img_' + currentExportingImage + '.png'
        assetsArray.push({
            id: currentSourceData.id,
            w: currentSourceData.width,
            h: currentSourceData.height,
            u: 'images/',
            p: imageName
        });
        var helperComp = app.project.items.addComp('tempConverterComp', Math.max(4, currentSource.width), Math.max(4, currentSource.height), 1, 1, 1);
        helperComp.layers.add(currentSource);
        var file = new File(folder.absoluteURI + '/' + imageName);
        helperComp.saveFrameToPng(0, file);
        helperComp.remove();
        currentExportingImage += 1;
        saveNextImage();
    }
    
    function exportImages(path, assets, compId, _originalNamesFlag) {
        if (imageSources.length === 0) {
            bm_renderManager.imagesReady();
            return;
        }
        currentCompID = compId;
        originalNamesFlag = _originalNamesFlag;
        bm_eventDispatcher.sendEvent('bm:render:update', {type: 'update', message: 'Exporting images', compId: currentCompID, progress: 0});
        currentExportingImage = 0;
        var file = new File(path);
        folder = file.parent;
        folder.changePath('images/');
        assetsArray = assets;
        if (!folder.exists) {
            if (folder.create()) {
                saveNextImage();
            } else {
                bm_eventDispatcher.sendEvent('alert', 'folder failed to be created at: ' + folder.fsName);
            }
        } else {
            saveNextImage();
        }
    }
    
    function addFont(fontName, fontFamily, fontStyle) {
        var i = 0, len = fonts.length;
        while (i < len) {
            if (fonts[i].name === fontName && fonts[i].family === fontFamily && fonts[i].style === fontStyle) {
                return;
            }
            i += 1;
        }
        fonts.push({
            name: fontName,
            family: fontFamily,
            style: fontStyle
        }
                  );
    }
    
    function getFonts() {
        return fonts;
    }
    
    function reset() {
        compSources.length = 0;
        imageSources.length = 0;
        fonts.length = 0;
        imageCount = 0;
        imageName = 0;
    }
    
    return {
        checkCompSource: checkCompSource,
        checkImageSource: checkImageSource,
        setCompSourceId: setCompSourceId,
        exportImages : exportImages,
        addFont : addFont,
        getFonts : getFonts,
        reset: reset
    };
    
}());