// https://my.oschina.net/xzfx/blog/480160
// https://stackoverflow.com/questions/24595460/how-to-access-update-rootscope-from-outside-angular

type JQElementParams = string | Element | Document | JQuery | ArrayLike<Element> | (() => void);

export function angularSelector(domPathSelector: JQElementParams): JQLite {
    return (window as any).angular.element(domPathSelector);
}

export function angularScope<T extends ng.IScope>(domPathSelector: string): T {
    return angularSelector(domPathSelector).scope();
}

export function angularInjector(domPathSelector: string): ng.auto.IInjectorService {
    return angularSelector(domPathSelector).injector();
}

export function angularController(domPathSelector: string): any {
    return angularSelector(domPathSelector).controller();
}

