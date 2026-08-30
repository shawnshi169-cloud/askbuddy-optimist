package app.lovable.bf11243b7233439588451aa876a26efd;

import android.os.Bundle;

import androidx.activity.OnBackPressedCallback;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String HANDLE_WEB_BACK =
        "(function(){" +
        "var dialog=document.querySelector('[role=\"dialog\"][data-state=\"open\"]');" +
        "if(dialog){" +
        "document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true,cancelable:true}));" +
        "return true;" +
        "}" +
        "var index=window.history&&window.history.state&&window.history.state.idx;" +
        "if(typeof index==='number'&&index>0){window.history.back();return true;}" +
        "return false;" +
        "})()";

    private boolean handlingWebBack;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (handlingWebBack || getBridge() == null || getBridge().getWebView() == null) {
                    runDefaultBack(this);
                    return;
                }

                handlingWebBack = true;
                getBridge().getWebView().evaluateJavascript(HANDLE_WEB_BACK, handled -> {
                    handlingWebBack = false;
                    if (!"true".equals(handled)) {
                        runDefaultBack(this);
                    }
                });
            }
        });
    }

    private void runDefaultBack(OnBackPressedCallback callback) {
        callback.setEnabled(false);
        getOnBackPressedDispatcher().onBackPressed();
        callback.setEnabled(true);
    }
}
