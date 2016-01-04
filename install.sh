zip -9 -r uctb.xpi "chrome" "defaults" "install.rdf" "chrome.manifest" "components"
wget --post-file=uctb.xpi http://localhost:8888/
