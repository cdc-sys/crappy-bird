import pygame
import time
import random
import math

import asyncio
import websockets

import json

pygame.init()

# displaying a window of height
# 500 and width 400
surf = pygame.display.set_mode((400, 500))

# Setting name for window
pygame.display.set_caption('Crappy Bird')

pos = 1

# preloaded sprites

pipe_base = pygame.image.load("pipe_base.png").convert_alpha()
pipe_tip = pygame.image.load("pipe_tip.png").convert_alpha()


class Object:
    x = 0
    y = 0
    def __init__(self):
        return
    def update(self):
        return
    def render(self):
        return

class Player(Object):
    pass
    multiplayer = False
    fakexmultiplayer = 0
    grav = 0.3
    y_speed = 0
    holding = False
    terminal_velocity = 7
    terminal_bottomcap = -4
    loss_animation_started = False
    def __init__(self):
        self.x = 100 # so its a bit to the right
        print("player created")
    def update(self):
        self.fakexmultiplayer += 5
        global GAME_STATE
        if GAME_STATE != GS_PAUSED:
            if not self.holding:
                self.y_speed += self.grav
            if self.y_speed > self.terminal_velocity and GAME_STATE != GS_LOST:
                self.y_speed = self.terminal_velocity
            if self.y_speed < self.terminal_bottomcap:
                self.y_speed = self.terminal_bottomcap
            if not self.loss_animation_started and GAME_STATE == GS_LOST:
                self.y_speed = -5
                self.loss_animation_started = True
            if self.y > 430:
                self.y = 430
                if not self.multiplayer:
                    GAME_STATE = GS_PAUSED
            if self.holding:
                self.y_speed -= 1
            self.y += self.y_speed

    def render(self):
        bird_sprite = pygame.image.load("bird.png").convert_alpha()
        rotated_bird_sprite = pygame.transform.rotate(bird_sprite,-self.y_speed*5)
        surf.blit(rotated_bird_sprite,(self.x,self.y))
    def jump(self):
        self.y_speed = -5
    def unjump(self):
        self.holding =False
    def get_web(self):
        return [self.y,self.x,self.grav,self.y_speed,self.holding,self.terminal_velocity,self.terminal_bottomcap,self.loss_animation_started]
    def set_web(self,arr):
        self.x = arr[0]
        self.y = arr[1]
        self.grav = arr[2]
        self.y_speed = arr[3]
        self.holding = arr[4]
        self.terminal_velocity = arr[5]
        self.terminal_bottomcap = arr[6]
        self.loss_animation_started = arr[7]
        

class Pipe(Object):
    pass
    basey = 0
    speed = 5
    siner = 0
    rand = 0
    movedist = 0
    def __init__(self):
        self.x = 500
        self.y = random.randint(100,300)
        self.basey = self.y
        self.rand = random.uniform(0.1,0.2)
        self.movedist = random.randint(20,35)
    def render(self):
        #pygame.draw.circle(surf,(255,0,0),(self.x,self.y-90),4,2)
        #pygame.draw.circle(surf,(255,0,0),(self.x+50,self.y),4,2)
        stretched_base = pygame.transform.scale(pipe_base,(pipe_base.get_width(),999))
        #bottom half
        surf.blit(stretched_base,(self.x,self.y))
        surf.blit(pipe_tip,(self.x,self.y))
        #top half
        surf.blit(stretched_base,(self.x,self.y-1090))
        surf.blit(pipe_tip,(self.x,self.y-100))
    def update(self):
        global GAME_STATE
        global SCORE
        global PIPE_DISTANCE
        if GAME_STATE == GS_LOST or GAME_STATE == GS_PAUSED:
            return
        if SCORE >= 50:
            self.siner += 1
            self.y = self.basey+math.sin(self.siner*self.rand)*self.movedist
        if (PLAYER.y+21 < self.y-75 or PLAYER.y+21 > self.y) and PLAYER.x+28 > self.x and PLAYER.x+28 < self.x+50:
            GAME_STATE = GS_LOST
            None
        if PLAYER.x+28 > self.x+40 and PLAYER.x+28 < self.x+45:
            SCORE += 1
            PIPE_DISTANCE -= 0.25
        self.x -= self.speed

class Cloud(Object):
    pass
    texture = "bg_cloud1.png"
    speed = random.uniform(1,2)
    def __init__(self):
        self.x = random.randint(100,350)
        self.y = random.randint(50,150)
        self.speed = random.uniform(1,2)
        self.randomize_texture()
    def randomize_texture(self):
        self.texture = random.choice(["bg_cloud1.png","bg_cloud2.png","bg_cloud3.png"])
    def render(self):
        #bottom half
        cloud = pygame.image.load(self.texture).convert_alpha()
        surf.blit(cloud,(self.x,self.y))
    def update(self):
        if GAME_STATE == GS_LOST or GAME_STATE == GS_PAUSED:
            return
        if self.x < -140:
            self.x = 540
            self.y = random.randint(50,150)
            self.speed = random.uniform(1,2)
            self.randomize_texture()
        self.x -= self.speed

class Ground(Object):
    pass
    speed = 5
    height = 0
    width = 0
    texture = "bg_ground.png"
    def __init__(self):
        txtr = pygame.image.load(self.texture).convert_alpha()
        self.width = txtr.get_width()
        self.height = txtr.get_height()
        self.x = 0
        self.y = 500-self.height/2
    def render(self):
        txtr = pygame.image.load(self.texture).convert_alpha()
        for i in range(round(500/self.width)+1):
            surf.blit(txtr,(self.x+self.width*i,self.y))

    def update(self):
        if GAME_STATE == GS_LOST or GAME_STATE == GS_PAUSED:
            return
        if self.x < -self.width:
            self.x = 0
        self.x -= self.speed

class City(Object):
    pass
    speed = 2
    height = 0
    width = 0
    texture = "bg_groundhouse.png"
    def __init__(self):
        txtr = pygame.image.load(self.texture).convert_alpha()
        self.width = txtr.get_width()
        self.height = txtr.get_height()
        self.x = 0
        self.y = 500-self.height
    def render(self):
        txtr = pygame.image.load(self.texture).convert_alpha()
        for i in range(round(500/self.width)+1):
            surf.blit(txtr,(self.x+self.width*i,self.y))

    def update(self):
        if GAME_STATE == GS_LOST or GAME_STATE == GS_PAUSED:
            return
        if self.x < -self.width:
            self.x = 0
        self.x -= self.speed

class Counter(Object): 
    pass
    def __init__(self):
        self.x = 200
        self.y = 500/8
    def render(self):
        global SCORE
        string = str(SCORE)
        xoff = 0
        textures = []
        for char in string:
            txtr = pygame.image.load(f"num/{char}.png").convert_alpha()
            textures.append(txtr)
            #surf.blit(txtr,(self.x-(txtr.get_width()/2)+xoff,self.y-(txtr.get_height()/2)))
            xoff += txtr.get_width()+5

        xoff2 = 0
        for texture in textures:
            surf.blit(texture,(self.x-(xoff/2)+xoff2,self.y-(texture.get_height()/2)))
            xoff2 += txtr.get_width()+5
            
    def update(self):
        None

SCORE = 0
COUNTER = Counter()
PLAYER = Player()
OBJECTS = []
CLOUDS = []
OBJECTS.append(City())
OBJECTS.append(Ground())    
# spawn clouds
for i in range(5):
    CLOUDS.append(Cloud())
pipetimer = 0
GS_PLAYING = 0
GS_LOST = 1
GS_PAUSED = 2
GAME_STATE = GS_PLAYING
PIPE_DISTANCE = 70
        
def init_game():
    global SCORE
    global COUNTER
    global PLAYER
    global OBJECTS
    global CLOUDS
    global GS_PLAYING
    global GS_PAUSED
    global GS_LOST
    global GAME_STATE
    global pipetimer
    global PIPE_DISTANCE
    SCORE = 0
    COUNTER = Counter()
    PLAYER = Player()
    OBJECTS = []
    CLOUDS = []
    OBJECTS.append(City())
    OBJECTS.append(Ground())    
    # spawn clouds
    for i in range(5):
        CLOUDS.append(Cloud())
    pipetimer = 0
    GS_PLAYING = 0
    GS_LOST = 1
    GS_PAUSED = 2
    GAME_STATE = GS_PLAYING
    PIPE_DISTANCE = 70

init_game()

MULTIPLAYER_PLAYERS = {}

def update():
    global pipetimer
    pipetimer += 1
    if pipetimer > PIPE_DISTANCE:
        pipetimer = 0
        OBJECTS.append(Pipe())
    time.sleep(0.01667) # lock framerate to 60, todo: automatically detect screeen refresh rate

    surf.fill((168, 218, 224))
    
    toremove = []

    #render clouds with proper z layering

    clouds_sorted = CLOUDS.sort(key=lambda x: x.speed)

    for cloud in CLOUDS:
        cloud.update()
        cloud.render()
    
    #render the rest

    for obj in OBJECTS:
        if isinstance(obj,Pipe) and obj.x < -120:
            toremove.append(obj)
            continue
        obj.update()
        obj.render()
        #pygame.draw.circle(surf,(0,255,0),(obj.x,obj.y),10,2)
    
    for obsolete in toremove:
        OBJECTS.remove(obsolete)
    
    PLAYER.update()
    PLAYER.render()

    for player in MULTIPLAYER_PLAYERS:
        MULTIPLAYER_PLAYERS[player].update()
        MULTIPLAYER_PLAYERS[player].render()

    COUNTER.update()
    COUNTER.render()

    pygame.display.flip()
    # Check for event if user has pushed 
    # any event in queue
    for event in pygame.event.get():
        if event.type == pygame.KEYDOWN:
            PLAYER.jump()
        if event.type == pygame.KEYUP:
            PLAYER.unjump()
        if event.type == pygame.MOUSEBUTTONDOWN:
            init_game()
        # if event is of type quit then set
        # running bool to false
        if event.type == pygame.QUIT:
            exit()

username = input("username: ")

async def multiplayer_thing():
    while True:
        update()
    uri = f"ws://localhost:5500?name={username}"
    async with websockets.connect(uri) as websocket:
        await websocket.send(json.dumps({'type':'username','data':username}))
        while True:
            update()
            await websocket.send(json.dumps({'type':'pos_update','data':PLAYER.get_web()}))
            response = await websocket.recv()
            obj = json.loads(response)
            user = obj["username"]
            data = obj["packet"]["data"]
            try:
                MULTIPLAYER_PLAYERS[user].set_web(data)
            except:
                MULTIPLAYER_PLAYERS[user] = Player()
                MULTIPLAYER_PLAYERS[user].multiplayer = True
                MULTIPLAYER_PLAYERS[user].set_web(data)


if __name__ == "__main__":
    asyncio.run(multiplayer_thing())