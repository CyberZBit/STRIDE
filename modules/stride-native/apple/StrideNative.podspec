Pod::Spec.new do |s|
  s.name         = 'StrideNative'
  s.version      = '1.0.0'
  s.summary      = 'STRIDE map and Live Activity integration'
  s.description  = s.summary
  s.homepage     = 'https://github.com/CyberZBit/STRIDE'
  s.license      = { :type => 'MIT' }
  s.author       = 'STRIDE'
  s.source       = { :git => 'https://github.com/CyberZBit/STRIDE.git' }
  s.platform     = :ios, '16.4'
  s.swift_version = '5.0'
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks   = 'MapKit', 'ActivityKit', 'CoreLocation', 'CoreMotion'
  s.source_files = '**/*.swift'
end
