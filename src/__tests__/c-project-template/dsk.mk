.PHONY: dsk

dsk: $(PROGRAM).dsk

$(PROGRAM).dsk: $(PROGRAM)
	cp $(IP65)/build/prodos.dsk $@
	java -jar $(AC) -as $@ program            < $<
	java -jar $(AC) -p  $@ program.system sys < $(shell cl65 --print-target-path)/apple2enh/util/loader.system
