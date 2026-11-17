require 'json'
require 'xcodeproj'

root = File.expand_path('..', __dir__)
config = JSON.parse(File.read(File.join(root, 'app.json'))).fetch('expo')
ios = config.fetch('ios')
project = Xcodeproj::Project.open(File.join(root, 'ios', 'STRIDE.xcodeproj'))
app = project.targets.find { |target| target.name == 'STRIDE' }
abort 'STRIDE app target not found' unless app
exit if project.targets.any? { |target| target.name == 'StrideWalkWidget' }

widget = project.new_target(:app_extension, 'StrideWalkWidget', :ios, '16.4')
sources = project.main_group.new_group('Walk Live Activity', '..')
%w[
  native/StrideWalkWidget/StrideWalkWidget.swift
  modules/stride-native/apple/WalkActivityAttributes.swift
].each do |path|
  widget.add_file_references([sources.new_file(path)])
end
sources.new_file('native/StrideWalkWidget/Info.plist')

widget.build_configurations.each do |configuration|
  settings = configuration.build_settings
  settings.merge!(
    'APPLICATION_EXTENSION_API_ONLY' => 'YES',
    'CODE_SIGNING_ALLOWED' => 'NO',
    'CURRENT_PROJECT_VERSION' => ios.fetch('buildNumber', '1'),
    'GENERATE_INFOPLIST_FILE' => 'NO',
    'INFOPLIST_FILE' => '$(SRCROOT)/../native/StrideWalkWidget/Info.plist',
    'LD_RUNPATH_SEARCH_PATHS' => ['$(inherited)', '@executable_path/Frameworks', '@executable_path/../../Frameworks'],
    'MARKETING_VERSION' => config.fetch('version'),
    'PRODUCT_BUNDLE_IDENTIFIER' => "#{ios.fetch('bundleIdentifier')}.walk-widget",
    'PRODUCT_NAME' => '$(TARGET_NAME)',
    'SKIP_INSTALL' => 'YES',
    'SWIFT_VERSION' => '5.0',
    'TARGETED_DEVICE_FAMILY' => '1'
  )
end

app.add_dependency(widget)
embed = app.new_copy_files_build_phase('Embed App Extensions')
embed.dst_subfolder_spec = '13'
embed.add_file_reference(widget.product_reference, true).settings = { 'ATTRIBUTES' => ['RemoveHeadersOnCopy'] }
project.save
