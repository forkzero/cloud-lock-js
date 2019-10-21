
devdeps:
	# https://github.com/mochajs/mocha/wiki/Growl-Notifications
	brew install terminal-notifier
	sudo npm install -g npm-check typedoc
	npm install

upgrade-npm:
	npm-check -u
