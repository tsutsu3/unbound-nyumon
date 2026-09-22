FROM pandoc/extra@sha256:dfae5cf73a0e0ad40acf23d2d2c4adf5715e560aeea3324aa87e68faaa2e70c9

# pandoc/extra には luatexja 本体はあるが、その既定和文フォントは含まれていない。
# ltjsbook が使う原ノ味フォントを追加し、日本語 PDF を追加設定なしで生成できるようにする。
RUN tlmgr update --self \
    && tlmgr install haranoaji \
    && mktexlsr \
    && luaotfload-tool --update --force
