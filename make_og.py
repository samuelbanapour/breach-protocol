#!/usr/bin/env python3
"""Render the Open Graph share card (1200x630) -> og-image.png."""
import os, math
os.environ.setdefault("SDL_VIDEODRIVER", "dummy")
os.environ.setdefault("SDL_AUDIODRIVER", "dummy")
import pygame

W, H = 1200, 630
pygame.init()
s = pygame.Surface((W, H), pygame.SRCALPHA)

NEON=(0,229,255); RED=(255,59,92); GREEN=(61,220,151); AMBER=(255,183,3)
INK=(207,233,255); DIM=(107,134,184)

# background gradient
top, bot = (12,22,46), (4,6,13)
for y in range(H):
    t=y/H; col=tuple(int(top[i]+(bot[i]-top[i])*t) for i in range(3))
    pygame.draw.line(s,(*col,255),(0,y),(W,y))
# radial glow top-center
glow=pygame.Surface((W,H),pygame.SRCALPHA)
pygame.draw.circle(glow,(0,229,255,30),(W//2,-40),520)
s.blit(glow,(0,0))
# faint grid
for x in range(0,W+1,60): pygame.draw.line(s,(0,229,255,16),(x,0),(x,H),1)
for y in range(0,H+1,60): pygame.draw.line(s,(0,229,255,16),(0,y),(W,y),1)

def font(path, size, bold=False):
    try:
        f=pygame.font.Font(path,size); f.set_bold(bold); return f
    except Exception:
        f=pygame.font.Font(None,size); f.set_bold(bold); return f
MENLO="/System/Library/Fonts/Menlo.ttc"
def textc(txt,x,y,size,color,bold=False,center=False):
    f=font(MENLO,size,bold); img=f.render(txt,True,color)
    r=img.get_rect();
    if center: r.center=(x,y)
    else: r.topleft=(x,y)
    s.blit(img,r); return r

# ---- right: hex shield + network ----
cx,cy=905,315
def hexagon(c,r,rot=-math.pi/2):
    return [(c[0]+r*math.cos(rot+i*math.pi/3),c[1]+r*math.sin(rot+i*math.pi/3)) for i in range(6)]
shield=hexagon((cx,cy),225)
pygame.draw.polygon(s,(8,16,34,235),shield)
for w,a in [(20,45),(12,90),(5,255)]:
    g=pygame.Surface((W,H),pygame.SRCALPHA); pygame.draw.polygon(g,(*NEON,a),shield,w); s.blit(g,(0,0))
outer=hexagon((cx,cy),132); breach_i=1
for i,p in enumerate(outer):
    col=RED if i==breach_i else NEON
    pygame.draw.line(s,(*col,230),(cx,cy),p,6)
for i,p in enumerate(outer):
    ip=(int(p[0]),int(p[1])); col=RED if i==breach_i else NEON
    if i==breach_i:
        for w,a in [(14,90),(0,255)]:
            g=pygame.Surface((W,H),pygame.SRCALPHA); pygame.draw.circle(g,(*col,a),ip,30 if w else 20,w); s.blit(g,(0,0))
        for k in range(8):
            ang=k*math.pi/4; pygame.draw.line(s,(*RED,200),ip,(ip[0]+44*math.cos(ang),ip[1]+44*math.sin(ang)),4)
    else:
        pygame.draw.circle(s,(10,20,40),ip,22); pygame.draw.circle(s,col,ip,22,5); pygame.draw.circle(s,(*col,230),ip,8)
pygame.draw.circle(s,(6,26,42),(cx,cy),34); pygame.draw.circle(s,NEON,(cx,cy),34,6)
pygame.draw.circle(s,NEON,(cx,cy-5),10)
pygame.draw.polygon(s,NEON,[(cx-5,cy-2),(cx+5,cy-2),(cx+9,cy+17),(cx-9,cy+17)])

# ---- left: text ----
textc("BREACH",70,120,96,NEON,bold=True)
textc("PROTOCOL",70,210,96,NEON,bold=True)
textc("// CYBERSECURITY STRATEGY",74,316,26,DIM)
textc("Defend the network as Blue Team —",70,372,30,INK)
textc("or breach it as a Red Hat hacker.",70,410,30,INK)
# chips
def chip(x,y,label,col):
    f=font(MENLO,24,True); img=f.render(label,True,col); w=img.get_width()+40
    pygame.draw.rect(s,(12,22,48),(x,y,w,48),border_radius=10)
    pygame.draw.rect(s,col,(x,y,w,48),2,border_radius=10)
    s.blit(img,(x+20,y+12)); return w
w1=chip(70,470,"BLUE TEAM",NEON); chip(70+w1+16,470,"RED HAT",RED)
textc("Tower-defense both ways  ·  65 achievements  ·  plays in your browser",70,548,22,DIM)

out=os.path.join(os.path.dirname(os.path.abspath(__file__)),"og-image.png")
pygame.image.save(s,out)
print("wrote",out)
pygame.quit()
