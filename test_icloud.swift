import Foundation

let fm = FileManager.default
let url = fm.url(forUbiquityContainerIdentifier: nil)
print("URL for nil: \(String(describing: url))")

let url2 = fm.url(forUbiquityContainerIdentifier: "iCloud.com.bishokudev.yada")
print("URL for iCloud.com.bishokudev.yada: \(String(describing: url2))")
