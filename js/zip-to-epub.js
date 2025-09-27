/**
 * Browser-compatible ZIP to EPUB converter based on the new logic.
 */

import { triggerDownload, getJSZip } from './browser-helpers.js';

/* ---------- EPUB builder ---------- */
async function buildEPUB(meta, chapters, cover) {
    const JSZip = await getJSZip();
    const zip = new JSZip();
    zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
    zip.folder('META-INF').file('container.xml',
`<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
 <rootfiles>
   <rootfile full-path="OEBPS/package.opf" media-type="application/oebps-package+xml"/>
 </rootfiles>
</container>`);

    const o = zip.folder('OEBPS');
    const rtl = meta.dir === 'rtl';
    const css = rtl
        ? '@import url("https://fonts.googleapis.com/css2?family=Amiri&display=swap");body{font-family:Amiri,serif;direction:rtl;text-align:right;margin:5%;line-height:1.5;}'
        : 'body{font-family:serif;line-height:1.4;margin:5%;}';
    o.file('style.css', css);

    const manifest = [], spine = [], nav = [], ncx = [];
    let i = 1;
    for (const ch of chapters) {
        const id = `c${i}`, file = `${id}.xhtml`;
        o.file(file,
`<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>${ch.title}</title><link rel="stylesheet" href="style.css"/></head>
<body><h2>${ch.title}</h2>
${ch.paragraphs.map(p => `<p>${p.normalize('NFC')}<br/></p>`).join('\n')}
</body></html>`);
        manifest.push({ id, href: file, type: 'application/xhtml+xml' });
        spine.push(id);
        nav.push(`<li><a href="${file}">${ch.title}</a></li>`);
        ncx.push(`<navPoint id="n${i}" playOrder="${i}">
  <navLabel><text>${ch.title}</text></navLabel><content src="${file}"/></navPoint>`);
        i++;
    }

    if (cover) {
        const coverExt = cover.name.split('.').pop()?.toLowerCase() || 'jpg';
        const coverFilename = `cover.${coverExt}`;
        const coverMediaType = (coverExt === 'jpg' || coverExt === 'jpeg') ? 'image/jpeg' : 'image/png';
        o.file(coverFilename, cover);
        manifest.push({ id: 'cover', href: coverFilename, type: coverMediaType, prop: 'cover-image' });
    }

    /* nav.xhtml (EPUB 3) */
    o.file('nav.xhtml',
`<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>Table of Contents</title></head>
<body><nav epub:type="toc"><h1>Contents</h1><ol>${nav.join('')}</ol></nav></body></html>`);
    manifest.push({ id: 'nav', href: 'nav.xhtml', type: 'application/xhtml+xml', prop: 'nav' });

    /* toc.ncx (EPUB 2) */
    o.file('toc.ncx',
`<?xml version="1.0" encoding="utf-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
<head><meta name="dtb:uid" content="urn:uuid:${crypto.randomUUID()}"/></head>
<docTitle><text>${meta.title}</text></docTitle>
<navMap>${ncx.join('')}</navMap></ncx>`);
    manifest.push({ id: 'ncx', href: 'toc.ncx', type: 'application/x-dtbncx+xml' });

    /* package.opf */
    const today = new Date().toISOString().split('T')[0];
    o.file('package.opf',
`<?xml version="1.0"?>
<package version="3.0" xmlns="http://www.idpf.org/2007/opf" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">urn:uuid:${crypto.randomUUID()}</dc:identifier>
    <dc:title>${meta.title}</dc:title>
    ${meta.author ? `<dc:creator>${meta.author}</dc:creator>` : ''}
    ${meta.desc ? `<dc:description>${meta.desc}</dc:description>` : ''}
    <dc:date>${today}</dc:date>
    ${cover ? '<meta name="cover" content="cover"/>' : ''}
  </metadata>
  <manifest>
    ${manifest.map(m => `<item id="${m.id}" href="${m.href}" media-type="${m.type}"${m.prop ? ' properties="' + m.prop + '"' : ''}/>`).join('\n    ')}
    <item id="css" href="style.css" media-type="text/css"/>
  </manifest>
  <spine toc="ncx"${rtl ? ' page-progression-direction="rtl"' : ''}>
    ${spine.map(id => `<itemref idref="${id}"/>`).join('\n    ')}
  </spine>
</package>`);

    return zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip', streamFiles: true });
}

export function initializeZipToEpub(showAppToast, toggleAppSpinner) {
    const createBtn = document.getElementById('createEpubBtn');
    const zipFileInput = document.getElementById('zipUploadForEpub');
    const titleInput = document.getElementById('epubTitle');
    const authorInput = document.getElementById('epubAuthor');
    const coverInput = document.getElementById('epubCoverImage');
    const statusEl = document.getElementById('statusMessageZipToEpub');

    if (!createBtn || !zipFileInput || !titleInput || !authorInput || !coverInput) {
        console.error('ZIP to EPUB UI elements not found. Initialization failed.');
        return;
    }

    createBtn.addEventListener('click', async (e) => {
        e.preventDefault();

        const title = titleInput.value.trim();
        const author = authorInput.value.trim();
        const zipFile = zipFileInput.files ? zipFileInput.files[0] : null;

        if (!title || !zipFile) {
            showAppToast("EPUB Title and a ZIP file are required.", true);
            statusEl.textContent = 'EPUB Title and a ZIP file are required.';
            statusEl.className = 'status error';
            statusEl.style.display = 'block';
            return;
        }

        toggleAppSpinner(true);
        try {
            const JSZip = await getJSZip();
            const zip = await JSZip.loadAsync(zipFile);
            const nSort = (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
            const txtFiles = Object.values(zip.files).filter(f => !f.dir && /\.txt$/i.test(f.name)).sort(nSort);

            if (!txtFiles.length) {
                throw new Error('The selected ZIP contains no .txt files.');
            }

            const chapters = [];
            for (const f of txtFiles) {
                const text = await f.async('string');
                const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
                chapters.push({ title: f.name.replace(/\.txt$/i, ''), paragraphs: lines });
            }

            const epubBlob = await buildEPUB(
                { title, author, desc: '', dir: 'ltr' },
                chapters,
                coverInput.files[0] || null
            );
            
            await triggerDownload(epubBlob, title.replace(/\s+/g, '_') + '.epub', 'application/epub+zip', showAppToast);

        } catch (err) {
            console.error("Error creating EPUB:", err);
            showAppToast(`Error: ${err.message}`, true);
        } finally {
            toggleAppSpinner(false);
        }
    });
}
