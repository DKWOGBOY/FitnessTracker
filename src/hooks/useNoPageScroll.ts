import { useEffect } from "react";

/** Disables the page's normal scroll while the calling screen is mounted -
 * for pages whose content currently fits within one viewport with room to
 * spare, so it doesn't rubber-band/scroll for no reason. Remove the call
 * once a page's content regularly exceeds the viewport again. */
export function useNoPageScroll() {
  useEffect(() => {
    document.body.classList.add("no-page-scroll");
    return () => document.body.classList.remove("no-page-scroll");
  }, []);
}
