#!/usr/bin/env python3
"""Render GameDistribution thumbnails/marketing art as JPGs into assets/.
Sizes: 512x384, 512x512, 200x120 (required) + 1280x720, 720x1280 (marketing)."""
import os, math
os.environ.setdefault("SDL_VIDEODRIVER", "dummy")
os.environ.setdefault("SDL_AUDIODRIVER", "dummy")
import pygame
pygame.init()

NEON=(0,229,255); RED=(255,59,92); INK=(207,233,255); DIM=(125,152,205)
MENLO="/System/Library/Fonts/Menlo.ttc"
def font(size, bold=True):
    try: f=pygame.font.Font(MENLO,int(size))
    except Exception: f=pygame.font.Font(None,int(size))
    f.set_bold(bold); return f
def fit(txt, maxw, maxsize):
    sz=int(maxsize)
    while sz>6 and font(sz).size(txt)[0]>maxw: sz-=1
    return font(sz)
def hexagon(c,r,rot=-math.pi/2):
    return [(c[0]+r*math.cos(rot+i*math.pi/3), c[1]+r*math.sin(rot+i*math.pi/3)) for i in range(6)]

def bg(W,H):
    s=pygame.Surface((W,H))
    top,bot=(12,22,46),(4,6,13)
    for y in range(H):
        t=y/H; s.fill(tuple(int(top[i]+(bot[i]-top[i])*t) for i in range(3)), (0,y,W,1))
    g=pygame.Surface((W,H),pygame.SRCALPHA)
    step=max(20,int(min(W,H)/10))
    for x in range(0,W+1,step): pygame.draw.line(g,(0,229,255,16),(x,0),(x,H))
    for y in range(0,H+1,step): pygame.draw.line(g,(0,229,255,16),(0,y),(W,y))
    s.blit(g,(0,0)); return s

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

def ctext(s,txt,cx,cy,f,color):
    img=f.render(txt,True,color); s.blit(img,img.get_rect(center=(cx,cy)))
def ltext(s,txt,x,cy,f,color):
    img=f.render(txt,True,color); r=img.get_rect(); r.midleft=(x,cy); s.blit(img,r)

def make(W,H):
    s=bg(W,H); ar=W/H
    if ar>=1.24:                     # landscape (incl. ~630x500 itch cover)
        R=int(H*0.34); cx=int(W*0.76); cy=H//2; shield(s,cx,cy,R)
        lx=int(W*0.06); gap=int(W*0.045)
        tw=max(40, (cx-R-int(R*0.11)) - lx - gap)    # keep text clear of the shield
        f=fit("PROTOCOL", tw, H*0.30)                # size the longer word; reuse for both
        bh=f.get_height(); has_tag = W>=600
        block=bh*1.9 + (bh*0.75 if has_tag else 0)
        y=cy - block/2 + bh*0.5
        ltext(s,"BREACH",lx,int(y),f,NEON); y+=bh*0.95
        ltext(s,"PROTOCOL",lx,int(y),f,NEON); y+=bh*0.95
        if has_tag:
            tag="Cyber tower-defense — defend or breach"
            ltext(s,tag,lx,int(y),fit(tag,tw,H*0.075),DIM)
    elif ar>=0.85:                   # square
        R=int(W*0.30); shield(s,W//2,int(H*0.40),R)
        fb=fit("BREACH",int(W*0.9),W*0.20); ctext(s,"BREACH",W//2,int(H*0.74),fb,NEON)
        fp=fit("PROTOCOL",int(W*0.9),W*0.16); ctext(s,"PROTOCOL",W//2,int(H*0.74)+int(fb.get_height()*0.9),fp,NEON)
    else:                            # portrait
        R=int(W*0.34); shield(s,W//2,int(H*0.30),R)
        fb=fit("BREACH",int(W*0.85),W*0.26); ctext(s,"BREACH",W//2,int(H*0.56),fb,NEON)
        fp=fit("PROTOCOL",int(W*0.85),W*0.22); ctext(s,"PROTOCOL",W//2,int(H*0.56)+int(fb.get_height()*0.92),fp,NEON)
        ctext(s,"Defend or breach",W//2,int(H*0.70),fit("Defend or breach",int(W*0.8),W*0.10),DIM)
    return s

OUT=os.path.join(os.path.dirname(os.path.abspath(__file__)),"assets")
os.makedirs(OUT,exist_ok=True)

if __name__=="__main__":
    for (W,H,name) in [(512,384,"thumb_512x384"),(512,512,"thumb_512x512"),(200,120,"thumb_200x120"),
                       (1280,720,"marketing_1280x720"),(720,1280,"marketing_720x1280"),
                       (1280,550,"marketing_1280x550"),
                       (630,500,"itch_cover_630x500"),
                       (920,430,"keymailer_capsule_920x430")]:
        pygame.image.save(make(W,H), os.path.join(OUT,name+".png"))
        print("rendered",name)
    pygame.quit()
