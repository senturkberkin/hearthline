import AppKit

let width = 1200
let height = 630
let canvas = NSImage(size: NSSize(width: width, height: height))

func color(_ hex: UInt32) -> NSColor {
  NSColor(
    red: CGFloat((hex >> 16) & 0xff) / 255,
    green: CGFloat((hex >> 8) & 0xff) / 255,
    blue: CGFloat(hex & 0xff) / 255,
    alpha: 1
  )
}

func text(_ value: String, x: CGFloat, y: CGFloat, size: CGFloat, weight: NSFont.Weight = .regular, shade: NSColor) {
  let attributes: [NSAttributedString.Key: Any] = [
    .font: NSFont.systemFont(ofSize: size, weight: weight),
    .foregroundColor: shade,
  ]
  NSAttributedString(string: value, attributes: attributes).draw(at: NSPoint(x: x, y: y))
}

canvas.lockFocus()

let background = NSGradient(starting: color(0xEDF4FF), ending: color(0xF8FAFC))!
background.draw(in: NSRect(x: 0, y: 0, width: width, height: height), angle: -35)

// Hearthline mark, rebuilt from the product's existing icon geometry.
color(0x1B68C8).setFill()
NSBezierPath(ovalIn: NSRect(x: 86, y: 500, width: 68, height: 68)).fill()
let roof = NSBezierPath()
roof.move(to: NSPoint(x: 106, y: 533))
roof.line(to: NSPoint(x: 120, y: 551))
roof.line(to: NSPoint(x: 136, y: 533))
color(0x8FC0EC).setStroke()
roof.lineWidth = 5
roof.lineCapStyle = .round
roof.lineJoinStyle = .round
roof.stroke()
let house = NSBezierPath()
house.move(to: NSPoint(x: 108, y: 510))
house.line(to: NSPoint(x: 108, y: 528))
house.move(to: NSPoint(x: 132, y: 510))
house.line(to: NSPoint(x: 132, y: 528))
house.move(to: NSPoint(x: 108, y: 519))
house.line(to: NSPoint(x: 132, y: 519))
NSColor.white.setStroke()
house.lineWidth = 7
house.lineCapStyle = .round
house.stroke()

let navy = color(0x173F70)
let muted = color(0x496079)
text("Hearthline", x: 172, y: 518, size: 34, weight: .bold, shade: navy)
text("Kira mı, ev almak mı?", x: 86, y: 367, size: 62, weight: .bold, shade: navy)
text("Rent vs. buy, on your terms.", x: 86, y: 304, size: 38, weight: .semibold, shade: navy)
text("Kendi varsayımlarınla nakit akışını karşılaştır.", x: 86, y: 232, size: 26, shade: muted)
text("Compare cash flow using your own assumptions.", x: 86, y: 194, size: 26, shade: muted)

let card = NSRect(x: 86, y: 72, width: 784, height: 92)
NSColor.white.setFill()
NSBezierPath(roundedRect: card, xRadius: 20, yRadius: 20).fill()
color(0x1B68C8).setFill()
NSBezierPath(ovalIn: NSRect(x: 112, y: 105, width: 27, height: 27)).fill()
let check = NSBezierPath()
check.move(to: NSPoint(x: 118, y: 117))
check.line(to: NSPoint(x: 123, y: 112))
check.line(to: NSPoint(x: 132, y: 123))
NSColor.white.setStroke()
check.lineWidth = 3.5
check.lineCapStyle = .round
check.lineJoinStyle = .round
check.stroke()
text("Senin senaryon, piyasa tahmini değil.", x: 158, y: 116, size: 20, weight: .bold, shade: navy)
text("Your scenario, not a market prediction.", x: 158, y: 88, size: 18, shade: muted)
text("Özel · Tarayıcıda hesaplanır · Planlama aracı, öneri değil", x: 86, y: 30, size: 17, shade: muted)
text("Private · In-browser · Planning aid, not a recommendation", x: 748, y: 30, size: 17, shade: muted)

canvas.unlockFocus()
guard let data = canvas.tiffRepresentation,
      let bitmap = NSBitmapImageRep(data: data),
      let png = bitmap.representation(using: .png, properties: [:]) else {
  fatalError("Could not encode social preview image")
}
try png.write(to: URL(fileURLWithPath: "public/hearthline-social-preview.png"))
