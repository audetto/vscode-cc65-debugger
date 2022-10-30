.PHONY: dsk

dsk: $(PROGRAM).dsk

# $(AC) is AppleCommander-ac-x.x.x.jar
# from
# https://github.com/AppleCommander/AppleCommander/releases
# build as
# make TARGETS=apple2 dsk
# or
# make TARGETS=apple2enh dsk

REMOVES += $(PROGRAM).dsk

$(PROGRAM).dsk: $(PROGRAM) prodos.dsk
	cp prodos.dsk $@
	java -jar $(AC) -as $@ startup            < $<
	java -jar $(AC) -as $@ program            < $<
	java -jar $(AC) -p  $@ program.system sys < $(shell cl65 --print-target-path)/$(TARGETS)/util/loader.system
