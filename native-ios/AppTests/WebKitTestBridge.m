#import "WebKitTestBridge.h"

void SPCallAsyncJavaScript(WKWebView *view, NSString *body, void (^completion)(id, NSError *)) {
    [view callAsyncJavaScript:body arguments:@{} inFrame:nil
              inContentWorld:WKContentWorld.pageWorld completionHandler:completion];
}
