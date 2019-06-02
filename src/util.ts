export async function delay(duration: number) {
    return new Promise(rs => {
        setTimeout(() => rs(), duration);
    });
}

export function download(href: string, filename = '') {
    console.log('触发下载', filename, href);
    let a = document.createElement('a');
    a.download = filename;
    a.href = href;
    a.click();
}

export function s(selector: string) {
    return document.querySelector(selector);
}

export function sa(selector: string) {
    return document.querySelectorAll(selector);
}
