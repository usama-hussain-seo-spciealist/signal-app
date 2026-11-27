#import <WebKit/WebKit.h>

// Use the Objective-C completion API in tests. Xcode 16's async Swift WebKit
// overlay may link a libswiftWebKit dylib absent from older Simulator runtimes.
void SPCallAsyncJavaScript(WKWebView * _Nonnull view, NSString * _Nonnull body,
                          void (^ _Nonnull completion)(id _Nullable, NSError * _Nullable));
