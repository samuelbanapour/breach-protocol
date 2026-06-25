#!/usr/bin/env python3
"""Render transparent-background logo assets (PNG with alpha) into assets/:
  logo_1024.png      — shield emblem + BREACH PROTOCOL wordmark
  icon_mark_1024.png — emblem only (square icon mark)"""
import os, math
os.environ.setdefault("SDL_VIDEODRIVER", "dummy")
os.environ.setdefault("SDL_AUDIODRIVER", "dummy")
import pygame
pygame.init()
NEON=(0,229,255); RED=(255,59,92)
MENLO="/System/Library/Fonts/Menlo.ttc"
def font(size,bold=True):
    try: f=pygame.font.Font(MENLO,int(size))
    except Exception: f=pygame.font.Font(None,int(size))
    f.set_bold(bold); return f
def fit(txt,maxw,maxsize):
    sz=int(maxsize)
    while sz>6 and font(sz).size(txt)[0]>maxw: sz-=1
    return font(sz)
def ctext(s,txt,cx,cy,f,color):
    img=f.render(txt,True,color); s.blit(img,img.get_rect(center=(cx,cy)))
def hexagon(c,r,rot=-math.pi/2):
    return [(c[0]+r*math.cos(rot+i*math.pi/3), c[1]+r*math.sin(rot+i*math.pi/3)) for i in range(6)]
def shield(s,cx,cy,R):
    hexp=hexagon((cx,cy),R)
    pygame.draw.polygon(s,(8,16,34),hexp)
    for w in (max(2,int(R*0.11)),max(2,int(R*0.06)),max(2,int(R*0.025))):
        pygame.draw.polygon(s,NEON,hexp,w)
    outer=hexagon((cx,cy),R*0.6); bi=1
    lw=max(2,int(R*0.028)); nr=max(3,int(R*0.11))
    for i,p in enumerate(outer):
        pygame.draw.line(s, RED if i==bi else NEON,(cx,cy),p,lw)
    for i,p in enumerate(outer):
        ip=(int(p[0]),int(p[1])); col=RED if i==bi else NEON
        if i==bi:
            pygame.draw.circle(s,col,ip,nr)
            for k in range(8):
                a=k*math.pi/4; pygame.draw.line(s,RED,ip,(ip[0]+R*0.2*math.cos(a),ip[1]+R*0.2*math.sin(a)),max(1,int(R*0.02)))
        else:
            pygame.draw.circle(s,(10,20,40),ip,nr); pygame.draw.circle(s,col,ip,nr,max(2,int(R*0.024)))
            pygame.draw.circle(s,col,ip,max(2,int(nr*0.36)))
    hr=max(6,int(R*0.17)); pygame.draw.circle(s,(6,26,42),(cx,cy),hr); pygame.draw.circle(s,NEON,(cx,cy),hr,max(2,int(R*0.028)))
    kr=max(2,int(R*0.055)); pygame.draw.circle(s,NEON,(cx,cy-int(R*0.02)),kr)
    pygame.draw.polygon(s,NEON,[(cx-kr,cy),(cx+kr,cy),(cx+int(kr*1.7),cy+int(R*0.085)),(cx-int(kr*1.7),cy+int(R*0.085))])

OUT=os.path.join(os.path.dirname(os.path.abspath(__file__)),"assets")
os.makedirs(OUT,exist_ok=True)

# logo: emblem + wordmark, transparent
s=pygame.Surface((1024,1024),pygame.SRCALPHA)
shield(s,512,400,300)
fb=fit("BREACH",900,180); ctext(s,"BREACH",512,760,fb,NEON)
fp=fit("PROTOCOL",900,150); ctext(s,"PROTOCOL",512,760+int(fb.get_height()*0.92),fp,NEON)
pygame.image.save(s,os.path.join(OUT,"logo_1024.png")); print("wrote logo_1024.png")

# icon mark only, transparent
s2=pygame.Surface((1024,1024),pygame.SRCALPHA)
shield(s2,512,512,430)
pygame.image.save(s2,os.path.join(OUT,"icon_mark_1024.png")); print("wrote icon_mark_1024.png")
pygame.quit()
