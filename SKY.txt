--[[
سكربت SKY (مُشروح)
- تم إضافة تعليقات فوق أهم الدوال وعناصر الواجهة لتوضيح وظيفتها/وش تمثل.
- أي تعليق يبدأ بـ "--" وما يأثر على تشغيل السكربت.
]]--

-- AUTO-FIX: wrapped whole script to ensure blocks are closed properly

do
--[[
SKY (OrionLib) - نسخة كاملة (Fix v4)
تعديلات هالمرة:
1) AntiThrow (مضاد رمي) صار يطفي/يشتغل صح + يرجعك لنفس مكانك "على الأرض" (يضبطك على الأرض وما يعلقك بالطيران)
2) AntiBots (مضاد بوتات) انصلح: يرجع يتنقّل على كل الكراسي + يجلس فعلياً على الكرسي
3) AntiBang (مضاد بانق) صار: إذا شغلته يوديك بعيد تحت الأرض ويخليك هناك لين تطفيه (بدون رجعة تلقائية)

ملاحظة: بعض الخرائط ما فيها Seats حقيقية (Seat/VehicleSeat). وقتها AntiBots ما بيلاقي كراسي.
]]

	-- ====== عدّل الرابط ======
	local DISCORD_LINK = "https://discord.gg/hKKebtnbbk"

	-- ====== Services ======
	-- خدمة اللاعبين
	local Players = game:GetService("Players")

	local ReplicatedStorage = game:GetService("ReplicatedStorage")
	local hdCommandRemote = nil

	-- تهيئة HD Admin (نفس سكربت 1st) + محاولة أخذ ريموت الأوامر
	pcall(function()
		local hdClient = ReplicatedStorage:FindFirstChild("HDAdminHDClient")
		if hdClient and hdClient:FindFirstChild("Signals") then
			local sigs = hdClient.Signals
			if sigs:FindFirstChild("ChangeSetting") then
				pcall(function()
					sigs.ChangeSetting:InvokeServer(sigs.ChangeSetting)
				end)
			end
			if sigs:FindFirstChild("Command") then
				hdCommandRemote = sigs.Command
			end
		end
	end)

	local function sendHDCommand(cmd)
		cmd = tostring(cmd or "")
		if cmd == "" then return end
		pcall(function()
			if hdCommandRemote then
				hdCommandRemote:InvokeServer(cmd)
			else
				Players:Chat(cmd)
			end
		end)
	end


	local function ResolvePlayerByName(name)
		if not name then return nil end
		name = tostring(name)
		name = name:gsub("^%s+", ""):gsub("%s+$", "")
		if name == "" then return nil end
		-- exact match
		local p = Players:FindFirstChild(name)
		if p and p:IsA("Player") then return p end
		-- case-insensitive partial
		local lower = name:lower()
		for _,pl in ipairs(Players:GetPlayers()) do
			if pl.Name:lower() == lower then return pl end
		end
		for _,pl in ipairs(Players:GetPlayers()) do
			if pl.Name:lower():find(lower, 1, true) then
				return pl
			end
		end
		return nil
	end

	local TeleportService = game:GetService("TeleportService")
	local HttpService = game:GetService("HttpService")
	-- خدمة إدخال المستخدم (ماوس/كيبورد/جوال)
	local UserInputService = game:GetService("UserInputService")
	-- RunService للتحديثات/اللوب
	local RunService = game:GetService("RunService")
	local SKY_TargetConnAdd, SKY_TargetConnRem = nil, nil
	-- CoreGui (مكان واجهات الكثير من الـExecutors)
	local CoreGui = game:GetService("CoreGui")
	local Workspace = game:GetService("Workspace")

	local plr = Players.LocalPlayer

	local VirtualUser = nil
	pcall(function() VirtualUser = game:GetService("VirtualUser") end)

	-- ====== Orion ======
	local OrionLib = loadstring(game:HttpGet(('https://raw.githubusercontent.com/AlaaEmad23557/Neon-Hub-Lib/main/Lib')))()

	OrionLib.Themes.SOFTBLACK = {
		Main     = Color3.fromRGB(0, 0, 0),
		Second   = Color3.fromRGB(0, 0, 0),
		Stroke   = Color3.fromRGB(70, 70, 70),
		Divider  = Color3.fromRGB(80, 80, 80),
		Text     = Color3.fromRGB(245, 245, 245),
		TextDark = Color3.fromRGB(190, 190, 190)
	}
	OrionLib.SelectedTheme = "SOFTBLACK"

	local Window = OrionLib:MakeWindow({
		Name = "SKY",
		SearchBar = { Default = "بحث", ClearTextOnFocus = true },
		HidePremium = false,
		SaveConfig = true,
		ConfigFolder = "SKY"
	})

	local ICON = "rbxassetid://4483345998"

	-- Tabs order (مثل طلبك)
	Window:MakeTab({ Name="Welcome",     Icon=ICON, PremiumOnly=false }):AddLabel("##WELCOME_CONTAINER##")
	Window:MakeTab({ Name="Counter",     Icon=ICON, PremiumOnly=false }):AddLabel("##COUNTER_CONTAINER##")
	Window:MakeTab({ Name="Target",      Icon=ICON, PremiumOnly=false }):AddLabel("##TARGET_CONTAINER##")
	Window:MakeTab({ Name="Scripts",     Icon=ICON, PremiumOnly=false }):AddLabel("##SCRIPTS_CONTAINER##")
	Window:MakeTab({ Name="Chat",        Icon=ICON, PremiumOnly=false }):AddLabel("##CHAT_CONTAINER##")
	Window:MakeTab({ Name="Auto button", Icon=ICON, PremiumOnly=false }):AddLabel("##AUTO_CONTAINER##")
	Window:MakeTab({ Name="Settings",    Icon=ICON, PremiumOnly=false }):AddLabel("##SETTINGS_CONTAINER##") -- مخفي من القائمة ويفتح من الترس

	OrionLib:Init()
	task.wait(0.9)

	-- ====== Helpers ======
	local function round(obj, r)
		local c = Instance.new("UICorner")
		c.CornerRadius = UDim.new(0, r)
		c.Parent = obj
	end

	local function copyClipboard(text)
		if setclipboard then pcall(setclipboard, text) end
	end

	local function accountCreatedText(plr_)
		local daysAge = tonumber(plr_.AccountAge) or 0
		local created = os.time() - (daysAge * 24 * 60 * 60)
		local createdText = os.date("%d-%m-%Y", created)
		return createdText, daysAge
	end

	-- يجلب واجهة Orion الرئيسية بالاسم (مثل SKY) من CoreGui/PlayerGui

	local function getOrionGui(titleText)
		for _,t in ipairs(CoreGui:GetDescendants()) do
			if t:IsA("TextLabel") and t.Text == titleText then
				local p = t.Parent
				while p and not p:IsA("ScreenGui") do
					p = p.Parent
				end
				return p
			end
		end
	end

	-- يدوّر على ScrollingFrame حق الصفحة عن طريق نص Sentinel مثل ##COUNTER_CONTAINER##

	local function findOrionScrollBySentinel(sentinelText)
		local function scan(root)
			for _,v in ipairs(root:GetDescendants()) do
				if (v:IsA("TextLabel") or v:IsA("TextBox")) and v.Text == sentinelText then
					local p = v
					while p and not p:IsA("ScrollingFrame") do
						p = p.Parent
					end
					return p
				end
			end
		end
		-- CoreGui (الأغلب)
		local got = scan(CoreGui)
		if got then return got end
		-- PlayerGui (احتياط)
		local pg = plr:FindFirstChildOfClass("PlayerGui")
		if pg then
			got = scan(pg)
			if got then return got end
		end
		return nil
	end

	local orionGui = getOrionGui("SKY")

	-- Hide Settings tab button in sidebar (نفتحها من الترس)
	task.spawn(function()
		task.wait(0.4)
		if not orionGui then return end
		for _,b in ipairs(orionGui:GetDescendants()) do
			if b:IsA("TextButton") and tostring(b.Text):lower():find("settings") then
				b.Visible = false
			end
		end
	end)

	-- ====== Toggle window (إخفاء/إظهار) ======
	local isMobile = UserInputService.TouchEnabled and not UserInputService.KeyboardEnabled
	local toggleKey = Enum.KeyCode.RightShift
	local SETTINGS_FILE = "SKY_settings.json"

	local function saveSettings()
		local data = { toggleKey = toggleKey.Name }
		pcall(function()
			if writefile then
				writefile(SETTINGS_FILE, HttpService:JSONEncode(data))
			end
		end)
	end

	local function loadSettings()
		pcall(function()
			if isfile and readfile and isfile(SETTINGS_FILE) then
				local decoded = HttpService:JSONDecode(readfile(SETTINGS_FILE))
				if decoded and decoded.toggleKey and Enum.KeyCode[tostring(decoded.toggleKey)] then
					toggleKey = Enum.KeyCode[tostring(decoded.toggleKey)]
				end
			end
		end)
	end
	loadSettings()

	UserInputService.InputBegan:Connect(function(input, gpe)
		-- لا تغلق الواجهة وأنت تكتب في الشات/أي TextBox
		if gpe then return end
		if UserInputService:GetFocusedTextBox() then return end
		if (not isMobile) and input.UserInputType == Enum.UserInputType.Keyboard and input.KeyCode == toggleKey then
			local og = getOrionGui("SKY")
			if og then og.Enabled = not og.Enabled end
			return
		end
	end)

	-- ====== Character refs ======
	local currentHum, currentHRP = nil, nil
	local function bindCharacter(char)
		currentHum = char:FindFirstChildOfClass("Humanoid")
		currentHRP = char:FindFirstChild("HumanoidRootPart")
	end
	if plr.Character then bindCharacter(plr.Character) end
	plr.CharacterAdded:Connect(function(c) task.wait(0.2); bindCharacter(c) end)

	-- ====== Ground helper (يحطك على الأرض) ======
	local rayParams = RaycastParams.new()
	rayParams.FilterType = Enum.RaycastFilterType.Blacklist

	local function getGroundedCFrame(fromCFrame)
		local char = plr.Character
		if not char then return fromCFrame end
		rayParams.FilterDescendantsInstances = {char}
		local origin = fromCFrame.Position + Vector3.new(0, 10, 0)
		local dir = Vector3.new(0, -500, 0)
		local hit = Workspace:Raycast(origin, dir, rayParams)
		if hit then
			return CFrame.new(hit.Position + Vector3.new(0, 3, 0))
		end
		-- fallback: ارفع شوي
		return fromCFrame + Vector3.new(0, 3, 0)
	end

	-- ====== AUTO States ======
	local AUTO = {
		AntiSit   = false, -- ما يشتغل تلقائي
		AntiCuff  = false, -- من سكربت 1st
		AntiCuffRe = false, -- مضاد كلبش re (/e .re)
		AntiFling = true,
		AntiThrow = true,
		AntiAFK   = true,
		AntiBots  = false, -- يدوي
		AntiBang  = false, -- يدوي
		CommandField = false,
	
		KatanaAnim = false,
	}
	local AUTO_SETTINGS_FILE = "SKY_auto.json"

	local function loadAutoSettings()
		pcall(function()
			if isfile and readfile and isfile(AUTO_SETTINGS_FILE) then
				local decoded = HttpService:JSONDecode(readfile(AUTO_SETTINGS_FILE))
				if type(decoded) == "table" then
					if decoded.KatanaAnim ~= nil then
						AUTO.KatanaAnim = decoded.KatanaAnim and true or false
					end
					if decoded.CommandField ~= nil then
						AUTO.CommandField = decoded.CommandField and true or false
						setCommandFieldVisible(AUTO.CommandField)
					end
				end
			end
		end)
	end

	local function saveAutoSettings()
		local data = {
			KatanaAnim = AUTO.KatanaAnim and true or false,
			CommandField = AUTO.CommandField and true or false,
		}
		pcall(function()
			if writefile then
				writefile(AUTO_SETTINGS_FILE, HttpService:JSONEncode(data))
			end
		end)
	end

	loadAutoSettings()



	-- ====== Safe position tracking ======
	local lastSafeCFrame = nil
	local lastSafeTime = 0

	local function updateSafe()
		local hrp = currentHRP
		if not hrp then return end
		if hrp.Position.Y > 5 then
			local now = tick()
			if now - lastSafeTime > 0.25 then
				lastSafeTime = now
				lastSafeCFrame = hrp.CFrame
			end
		end
	end

	-- ====== AntiSit (خفيف) ======
	RunService.Heartbeat:Connect(function()
		updateSafe()
		if AUTO.AntiSit and currentHum then
			if currentHum.Sit then currentHum.Sit = false end
		end
	end)

	-- ====== AntiAFK ======
	plr.Idled:Connect(function()
		if AUTO.AntiAFK and VirtualUser then
			pcall(function()
				VirtualUser:Button2Down(Vector2.new(0,0),workspace.CurrentCamera.CFrame)
				task.wait(1)
				VirtualUser:Button2Up(Vector2.new(0,0),workspace.CurrentCamera.CFrame)
			end)
		end
	end)

	-- ====== AntiFling (تطيح وما تموت) ======
	local function applyAntiDeathSettings(hum)
		pcall(function() hum.BreakJointsOnDeath = false end)
		pcall(function() hum.RequiresNeck = false end)
		pcall(function() hum:SetStateEnabled(Enum.HumanoidStateType.Dead, false) end)
	end

	local originalFallenHeight = workspace.FallenPartsDestroyHeight

	local function setAntiFlingEnabled(v)
		AUTO.AntiFling = v
		if v then
			originalFallenHeight = workspace.FallenPartsDestroyHeight
			workspace.FallenPartsDestroyHeight = -1000000 -- يمنع حذف الجسم تحت الماب (أهم شي)
		else
			workspace.FallenPartsDestroyHeight = originalFallenHeight
		end
	end
	setAntiFlingEnabled(true)

	RunService.Stepped:Connect(function()
		if not AUTO.AntiFling then return end
		local hum = currentHum
		local hrp = currentHRP
		if not hum or not hrp then return end

		applyAntiDeathSettings(hum)

		-- صفّر السبين بس (خفيف)
		if hrp.AssemblyAngularVelocity.Magnitude > 80 then
			hrp.AssemblyAngularVelocity = Vector3.zero
		end

		-- إذا حاول يموت تحت الماب، رجّع الصحة (بدون رفع)
		if hum.Health <= 0 then
			hum.Health = math.max(hum.MaxHealth, 100)
			pcall(function() hum:ChangeState(Enum.HumanoidStateType.Freefall) end)
		end
	end)

	-- ====== AntiThrow (يشتغل/يطفي صح + يرجعك "على الأرض") ======
	local antiThrowConn = nil

	local function stopAntiThrow()
		if antiThrowConn then
			antiThrowConn:Disconnect()
			antiThrowConn = nil
		end
	end

	local function startAntiThrow()
		stopAntiThrow()
		antiThrowConn = RunService.Heartbeat:Connect(function()
			if not AUTO.AntiThrow then return end
			local hrp = currentHRP
			local hum = currentHum
			if not hrp or not hum then return end
			if not lastSafeCFrame then return end

			-- trigger: رمي/اندفاع قوي لتحت
			local lv = hrp.AssemblyLinearVelocity
			if hrp.Position.Y < -30 and (lv.Y < -90 or lv.Magnitude > 120) then
				local target = getGroundedCFrame(lastSafeCFrame)
				hrp.CFrame = target
				hrp.AssemblyLinearVelocity = Vector3.zero
				hrp.AssemblyAngularVelocity = Vector3.zero
				pcall(function()
					hum.PlatformStand = false
					hum.Sit = false
					hum:ChangeState(Enum.HumanoidStateType.GettingUp)
				end)
			end
		end)
	end

	AUTO.AntiThrow = true
	startAntiThrow()

	-- ====== AntiBang (يوصلك بعيد تحت الأرض ويخليك هناك لين تطفيه) ======
	local BANG_XZ = 1000000000  -- 1e9 (آمن). إذا تبي أكبر جرّب ترفعها لكن بعض المابات/الفيزياء ممكن تخرب
	local BANG_Y  = -6000

	local antiBangTaskId = 0

	local function startAntiBang()
		antiBangTaskId += 1
		local myId = antiBangTaskId

		task.spawn(function()
			-- خذ مكان رجعة
			local back = lastSafeCFrame or (currentHRP and currentHRP.CFrame)
			while AUTO.AntiBang and myId == antiBangTaskId do
				local hrp = currentHRP
				local hum = currentHum
				if hrp and hum then
					applyAntiDeathSettings(hum)
					-- مكان بعيد تحت (نفس XZ عشان ما يضيع)
					hrp.CFrame = CFrame.new(BANG_XZ, BANG_Y, BANG_XZ)
					hrp.AssemblyLinearVelocity = Vector3.zero
					hrp.AssemblyAngularVelocity = Vector3.zero
					-- حافظ على الحياة
					if hum.Health <= 0 then hum.Health = math.max(hum.MaxHealth, 100) end
				end
				task.wait(0.2)
			end

			-- رجّعك إذا طفيته
			local hrp = currentHRP
			local hum = currentHum
			if hrp and hum then
				local to = back or lastSafeCFrame or hrp.CFrame
				to = getGroundedCFrame(to)
				hrp.CFrame = to
				hrp.AssemblyLinearVelocity = Vector3.zero
				hrp.AssemblyAngularVelocity = Vector3.zero
				pcall(function()
					hum.PlatformStand = false
					hum.Sit = false
					hum:ChangeState(Enum.HumanoidStateType.GettingUp)
				end)
			end
		end)
	end

		-- ======

	-- مضاد كلبش re: يعتمد على الريموت - أي RemoteEvent يرسل لك حدث، يطلق /e .re باسمك
	local antiCuffReTaskId = 0
	local lastAntiReTime = 0

	local function fireReOnce()
		local now = tick()
		if now - lastAntiReTime < 0.6 then return end
		lastAntiReTime = now
		pcall(function()
			game:GetService("Players"):Chat("/e .re " .. plr.Name)
		end)
	end

	local function startAntiCuffRe()
		AUTO.AntiCuffRe = true
		antiCuffReTaskId += 1
		local myId = antiCuffReTaskId
		task.spawn(function()
			while AUTO.AntiCuffRe and myId == antiCuffReTaskId do
				fireReOnce()
				task.wait(1)
			end
		end)
	end

	local function stopAntiCuffRe()
		AUTO.AntiCuffRe = false
		antiCuffReTaskId += 1
	end

-- ====== AntiCuff (من سكربت 1st: تثبيت الجسم ومنع تأثير الكلبشة) ======
	local antiCuffMoveConn = nil
	local antiCuffCharConn = nil

	local function applyAntiCuffToChar(char)
		if not AUTO.AntiCuff then return end
		if not char then return end
		local hum = char:FindFirstChildOfClass("Humanoid")
		local root = char:FindFirstChild("HumanoidRootPart") or char:FindFirstChild("Torso")
		if not hum or not root then return end

		if antiCuffMoveConn then
			antiCuffMoveConn:Disconnect()
			antiCuffMoveConn = nil
		end

		local RunService = game:GetService("RunService")
		antiCuffMoveConn = RunService.Heartbeat:Connect(function()
			if not AUTO.AntiCuff then return end
			if not char or char.Parent == nil then return end

			-- لو الهومانويد أو الروت تغيروا (مثلاً .re) نعيد التقاطهم
			if not hum or hum.Parent == nil then
				hum = char:FindFirstChildOfClass("Humanoid")
			end
			if not root or root.Parent == nil then
				root = char:FindFirstChild("HumanoidRootPart") or char:FindFirstChild("Torso")
			end
			if not hum or not root then return end

			-- نرجّع إعدادات الجلوس / الحالات كل فريم عشان أي re أو سكربت ما يلغي المضاد
			hum.Sit = true
			hum:SetStateEnabled(Enum.HumanoidStateType.Seated, false)
			hum:SetStateEnabled(Enum.HumanoidStateType.Physics, false)
			local moveDir = hum.MoveDirection
			if moveDir.Magnitude > 0 then
				local v = root.Velocity
				root.Velocity = Vector3.new(moveDir.X * 16, v.Y, moveDir.Z * 16)
			end
		end)
	end

	local function startAntiCuff()
		AUTO.AntiCuff = true
		local char = plr.Character or plr.CharacterAdded:Wait()
		applyAntiCuffToChar(char)

		if antiCuffCharConn then
			antiCuffCharConn:Disconnect()
			antiCuffCharConn = nil
		end

		antiCuffCharConn = plr.CharacterAdded:Connect(function(newChar)
			if not AUTO.AntiCuff then return end
			applyAntiCuffToChar(newChar)
		end)
	end

	local function stopAntiCuff()
		AUTO.AntiCuff = false
		if antiCuffCharConn then
			antiCuffCharConn:Disconnect()
			antiCuffCharConn = nil
		end
		if antiCuffMoveConn then
			antiCuffMoveConn:Disconnect()
			antiCuffMoveConn = nil
		end

		local char = plr.Character
		if char then
			local hum = char:FindFirstChildOfClass("Humanoid")
			if hum then
				hum.Sit = false
				hum:SetStateEnabled(Enum.HumanoidStateType.Seated, true)
				hum:SetStateEnabled(Enum.HumanoidStateType.Physics, true)
			end
		end
	end

-- ====== AntiBots (يتنقل على كل الكراسي بسرعة بدون ما يجلس) ======
	local antiBotsTaskId = 0

	local function getAllSeats()
		local seats = {}
		for _,d in ipairs(workspace:GetDescendants()) do
			if d:IsA("Seat") or d:IsA("VehicleSeat") then
				table.insert(seats, d)
			end
		end
		return seats
	end

	local function standOnSeatCFrame(seat, hum)
		local y = 0
		pcall(function()
			y = (seat.Size.Y/2) + (hum.HipHeight or 0) + 0.15
		end)
		local pos = seat.Position + Vector3.new(0, y, 0)
		return CFrame.new(pos, pos + seat.CFrame.LookVector)
	end


		local katanaTaskId = 0
	local katanaAnim = Instance.new("Animation")
	katanaAnim.AnimationId = "rbxassetid://18396187889" -- رقصت 2 / انيميشن كاتانا
	local katanaTrack = nil
	local katanaConns = {}
	local katanaCharConn = nil

	local function clearKatanaConns()
		for i = #katanaConns, 1, -1 do
			local c = katanaConns[i]
			if c then
				pcall(function() c:Disconnect() end)
			end
			katanaConns[i] = nil
		end
	end

	local function stopKatanaTrack()
		if katanaTrack then
			pcall(function() katanaTrack:Stop() end)
			katanaTrack = nil
		end
	end

	local function bindKatanaToChar(char, myId)
		if not char then return end
		local hum = char:FindFirstChildOfClass("Humanoid") or char:WaitForChild("Humanoid", 5)
		if not hum then return end

		clearKatanaConns()
		stopKatanaTrack()

		local function hookTool(tool)
			if myId ~= katanaTaskId then return end
			if not tool:IsA("Tool") then return end

			table.insert(katanaConns, tool.Equipped:Connect(function()
				if not AUTO.KatanaAnim or myId ~= katanaTaskId then return end
				stopKatanaTrack()
				local ok, track = pcall(function()
					return hum:LoadAnimation(katanaAnim)
				end)
				if not ok or not track then return end
				katanaTrack = track
				katanaTrack.Looped = false
				pcall(function()
					katanaTrack:Play()
				end)
			end))

		end

		for _,child in ipairs(char:GetChildren()) do
			hookTool(child)
		end
		table.insert(katanaConns, char.ChildAdded:Connect(hookTool))
	end

	local function startKatanaAnim()
		katanaTaskId += 1
		local myId = katanaTaskId

		clearKatanaConns()
		stopKatanaTrack()

		local char = plr.Character
		if char then
			bindKatanaToChar(char, myId)
		end

		if katanaCharConn then
			katanaCharConn:Disconnect()
			katanaCharConn = nil
		end

		katanaCharConn = plr.CharacterAdded:Connect(function(newChar)
			if not AUTO.KatanaAnim then return end
			bindKatanaToChar(newChar, myId)
		end)
	end

	local function stopKatanaAnim()
		katanaTaskId += 1
		if katanaCharConn then
			katanaCharConn:Disconnect()
			katanaCharConn = nil
		end
		clearKatanaConns()
		stopKatanaTrack()
	end

	if AUTO.KatanaAnim then
		startKatanaAnim()
	end

local function startAntiBots()
		antiBotsTaskId += 1
		local myId = antiBotsTaskId

		task.spawn(function()
			local idx = 1
			while AUTO.AntiBots and myId == antiBotsTaskId do
				local hrp = currentHRP
				local hum = currentHum
				if not hrp or not hum then task.wait(0.05); continue end

				local seats = getAllSeats()
				if #seats == 0 then
					task.wait(0.2)
					continue
				end

				if idx > #seats then idx = 1 end
				local seat = seats[idx]
				idx += 1

				if seat and seat.Parent then
					pcall(function()
						-- بدون جلوس: نخليه واقف فوق الكرسي مباشرة
						hum.Sit = false
						hum.PlatformStand = false
						local cf = standOnSeatCFrame(seat, hum)
						hrp.CFrame = cf
						hrp.AssemblyLinearVelocity = Vector3.zero
						hrp.AssemblyAngularVelocity = Vector3.zero
					end)
				end

				-- أسرع
				task.wait(0.01)
			end
		end)
	end

	-- ====== Rejoin / Hop ======
	local function doRejoinSameServer()
		pcall(function()
			TeleportService:TeleportToPlaceInstance(game.PlaceId, game.JobId, plr)
		end)
	end

	local function doServerHop()
		local placeId = game.PlaceId
		local cursor = ""
		for _ = 1, 6 do
			local url = ("https://games.roblox.com/v1/games/%d/servers/Public?sortOrder=Asc&limit=100"):format(placeId)
			if cursor ~= "" then url = url .. "&cursor=" .. cursor end
			local ok, body = pcall(function() return game:HttpGet(url) end)
			if not ok or not body then break end
			local data = HttpService:JSONDecode(body)
			if data and data.data then
				for _,srv in ipairs(data.data) do
					if srv.id and srv.playing and srv.maxPlayers and srv.playing < srv.maxPlayers and srv.id ~= game.JobId then
						pcall(function()
							TeleportService:TeleportToPlaceInstance(placeId, srv.id, plr)
						end)
						return
					end
				end
			end
			cursor = (data and data.nextPageCursor) or ""
			if cursor == "" then break end
		end
	end

	-- ====== UI widgets ======
	local function MakeSwitch(parent, text, get, set)
		-- كرت معلومات اللاعب (يمين) أو كرت لاعب داخل القائمة

		local card = Instance.new("Frame")
		card.Parent = parent
		card.BackgroundColor3 = Color3.fromRGB(25,25,25)
		card.BackgroundTransparency = 0.12
		card.BorderSizePixel = 0
		card.Size = UDim2.new(1, 0, 0, 54)
		round(card, 12)

		local lbl = Instance.new("TextLabel")
		lbl.Parent = card
		lbl.BackgroundTransparency = 1
		lbl.Position = UDim2.new(0, 14, 0, 0)
		lbl.Size = UDim2.new(1, -90, 1, 0)
		lbl.Font = Enum.Font.GothamBold
		lbl.TextSize = 16
		lbl.TextColor3 = Color3.fromRGB(235,235,235)
		lbl.TextXAlignment = Enum.TextXAlignment.Left
		lbl.Text = text

		local toggle = Instance.new("TextButton")
		toggle.Parent = card
		toggle.BackgroundColor3 = Color3.fromRGB(40,40,40)
		toggle.BorderSizePixel = 0
		toggle.Size = UDim2.new(0, 56, 0, 26)
		toggle.Position = UDim2.new(1, -70, 0.5, -13)
		toggle.Text = ""
		round(toggle, 999)

		local knob = Instance.new("Frame")
		knob.Parent = toggle
		knob.BackgroundColor3 = Color3.fromRGB(230,230,230)
		knob.BorderSizePixel = 0
		knob.Size = UDim2.new(0, 22, 0, 22)
		knob.Position = UDim2.new(0, 2, 0.5, -11)
		round(knob, 999)

		local function refresh()
			local on = get()
			if on then
				toggle.BackgroundColor3 = Color3.fromRGB(70, 70, 70)
				knob.Position = UDim2.new(1, -24, 0.5, -11)
			else
				toggle.BackgroundColor3 = Color3.fromRGB(40, 40, 40)
				knob.Position = UDim2.new(0, 2, 0.5, -11)
			end
		end

		refresh()
		toggle.MouseButton1Click:Connect(function()
			set(not get())
			refresh()
		end)

		return card, refresh
	end

	local function MakeWideBtn(parent, text, callback)
		local b = Instance.new("TextButton")
		b.Parent = parent
		b.BackgroundColor3 = Color3.fromRGB(240,240,240)
		b.BorderSizePixel = 0
		b.Size = UDim2.new(1, 0, 0, 52)
		b.Text = text
		b.Font = Enum.Font.GothamBold
		b.TextSize = 16
		b.TextColor3 = Color3.fromRGB(0,0,0)
		round(b, 12)
		b.MouseButton1Click:Connect(function() task.spawn(callback) end)
		return b
	end

	-- ====== WELCOME UI ======
	do
		local sf = findOrionScrollBySentinel("##WELCOME_CONTAINER##")
		if sf and sf:IsA("ScrollingFrame") then
			sf.Active = true
			sf.ScrollingEnabled = true
			sf.AutomaticCanvasSize = Enum.AutomaticSize.Y

			for _,ch in ipairs(sf:GetChildren()) do
				if not ch:IsA("UIListLayout") and not ch:IsA("UIPadding") then ch:Destroy() end
			end

			local list = sf:FindFirstChildOfClass("UIListLayout") or Instance.new("UIListLayout", sf)
			list.SortOrder = Enum.SortOrder.LayoutOrder
			list.Padding = UDim.new(0, 12)

			local pad = sf:FindFirstChildOfClass("UIPadding") or Instance.new("UIPadding", sf)
			pad.PaddingTop = UDim.new(0, 12)
			pad.PaddingLeft = UDim.new(0, 12)
			pad.PaddingRight = UDim.new(0, 12)
			pad.PaddingBottom = UDim.new(0, 12)

			local page = Instance.new("Frame")
			page.Parent = sf
			page.BackgroundTransparency = 1
			page.Size = UDim2.new(1, 0, 0, 380)

			local Avatar = Instance.new("ImageLabel")
			Avatar.Parent = page
			Avatar.BackgroundTransparency = 1
			Avatar.Size = UDim2.new(0, 120, 0, 120)
			Avatar.Position = UDim2.new(0.5, -60, 0, 5)
			Avatar.Image = Players:GetUserThumbnailAsync(plr.UserId, Enum.ThumbnailType.HeadShot, Enum.ThumbnailSize.Size180x180)
			round(Avatar, 999)

			local WelcomeText = Instance.new("TextLabel")
			WelcomeText.Parent = page
			WelcomeText.BackgroundTransparency = 1
			WelcomeText.Size = UDim2.new(1, 0, 0, 40)
			WelcomeText.Position = UDim2.new(0, 0, 0, 130)
			WelcomeText.Text = "Welcome ، " .. plr.Name
			WelcomeText.Font = Enum.Font.GothamBold
			WelcomeText.TextSize = 28
			WelcomeText.TextColor3 = Color3.fromRGB(255,255,255)
			WelcomeText.TextXAlignment = Enum.TextXAlignment.Center

			local CopyBtn = Instance.new("TextButton")
			CopyBtn.Parent = page
			CopyBtn.Size = UDim2.new(0, 320, 0, 55)
			CopyBtn.Position = UDim2.new(0.5, -160, 0, 180)
			CopyBtn.Text = "نسخ رابط الديسكورد"
			CopyBtn.Font = Enum.Font.GothamBold
			CopyBtn.TextSize = 18
			CopyBtn.TextColor3 = Color3.fromRGB(0,0,0)
			CopyBtn.BackgroundColor3 = Color3.fromRGB(240,240,240)
			CopyBtn.BorderSizePixel = 0
			round(CopyBtn, 14)
			CopyBtn.MouseButton1Click:Connect(function() copyClipboard(DISCORD_LINK) end)

			local Note1 = Instance.new("TextLabel")
			Note1.Parent = page
			Note1.BackgroundTransparency = 1
			Note1.Size = UDim2.new(1, 0, 0, 20)
			Note1.Position = UDim2.new(0, 0, 0, 245)
			Note1.Text = "جميع الحقوق محفوظة في سيرفر الديسكورد"
			Note1.Font = Enum.Font.Gotham
			Note1.TextSize = 14
			Note1.TextColor3 = Color3.fromRGB(200,200,200)
			Note1.TextXAlignment = Enum.TextXAlignment.Center

			local Note2 = Instance.new("TextLabel")
			Note2.Parent = page
			Note2.BackgroundTransparency = 1
			Note2.Size = UDim2.new(1, 0, 0, 20)
			Note2.Position = UDim2.new(0, 0, 0, 270)
			Note2.Text = "(نسخ السيرفر الجديد وخش معنا)"
			Note2.Font = Enum.Font.Gotham
			Note2.TextSize = 14
			Note2.TextColor3 = Color3.fromRGB(180,180,180)
			Note2.TextXAlignment = Enum.TextXAlignment.Center
		end
	end

	-- ====== AUTO UI (عمودين) ======
	do
		local sf = findOrionScrollBySentinel("##AUTO_CONTAINER##")
		if sf and sf:IsA("ScrollingFrame") then
			sf.Active = true
			sf.ScrollingEnabled = true
			sf.ScrollBarThickness = 6
			sf.AutomaticCanvasSize = Enum.AutomaticSize.Y

			for _,ch in ipairs(sf:GetChildren()) do
				if not ch:IsA("UIListLayout") and not ch:IsA("UIPadding") then ch:Destroy() end
			end

			local list = sf:FindFirstChildOfClass("UIListLayout") or Instance.new("UIListLayout", sf)
			list.SortOrder = Enum.SortOrder.LayoutOrder
			list.Padding = UDim.new(0, 12)

			local pad = sf:FindFirstChildOfClass("UIPadding") or Instance.new("UIPadding", sf)
			pad.PaddingTop = UDim.new(0, 12)
			pad.PaddingLeft = UDim.new(0, 12)
			pad.PaddingRight = UDim.new(0, 12)
			pad.PaddingBottom = UDim.new(0, 12)

			-- عنوان داخل الهيدر

			local title = Instance.new("TextLabel")
			title.Parent = sf
			title.BackgroundTransparency = 1
			title.Size = UDim2.new(1, 0, 0, 44)
			title.Font = Enum.Font.GothamBold
			title.TextSize = 26
			title.TextColor3 = Color3.fromRGB(255,255,255)
			title.Text = "Auto button"
			title.TextXAlignment = Enum.TextXAlignment.Center

			local actions = Instance.new("Frame")
			actions.Parent = sf
			actions.BackgroundTransparency = 1
			actions.Size = UDim2.new(1, 0, 0, 120)
			local aList = Instance.new("UIListLayout", actions)
			aList.SortOrder = Enum.SortOrder.LayoutOrder
			aList.Padding = UDim.new(0, 12)

			MakeWideBtn(actions, "تغيير سيرفر", doServerHop)
			MakeWideBtn(actions, "اعاده دخول", doRejoinSameServer)

			-- حاوية أزرار الأوامر (Grid)

			local grid = Instance.new("Frame")
			grid.Parent = sf
			grid.BackgroundTransparency = 1
			grid.Size = UDim2.new(1, 0, 0, 420)

			local left = Instance.new("Frame")
			left.Parent = grid
			left.BackgroundTransparency = 1
			left.Size = UDim2.new(0.5, -6, 1, 0)

			local right = Instance.new("Frame")
			right.Parent = grid
			right.BackgroundTransparency = 1
			right.Size = UDim2.new(0.5, -6, 1, 0)
			right.Position = UDim2.new(0.5, 6, 0, 0)

			local lList = Instance.new("UIListLayout", left)
			lList.SortOrder = Enum.SortOrder.LayoutOrder
			lList.Padding = UDim.new(0, 12)

			local rList = Instance.new("UIListLayout", right)
			rList.SortOrder = Enum.SortOrder.LayoutOrder
			rList.Padding = UDim.new(0, 12)

			MakeSwitch(left,  "مضاد جلوس", function() return AUTO.AntiSit end, function(v) AUTO.AntiSit = v end)
			MakeSwitch(left,  "مضاد كلبشه", function() return AUTO.AntiCuff end, function(v)
				if v then
					startAntiCuff()
				else
					stopAntiCuff()
				end
				saveAutoSettings()
			end)

			MakeSwitch(left,  "مضاد كلبش re", function() return AUTO.AntiCuffRe end, function(v)
				if v then
					startAntiCuffRe()
				else
					stopAntiCuffRe()
				end
				saveAutoSettings()
			end)

			MakeSwitch(right, "مضاد فلنق", function() return AUTO.AntiFling end, function(v) setAntiFlingEnabled(v) end)
			MakeSwitch(right, "مضاد رمي",  function() return AUTO.AntiThrow end, function(v)
				AUTO.AntiThrow = v
				if v then startAntiThrow() else stopAntiThrow() end
			end)

			MakeSwitch(left,  "مضاد بوتات", function() return AUTO.AntiBots end, function(v)
				AUTO.AntiBots = v
				if v then startAntiBots() else antiBotsTaskId += 1 end
			end)


			MakeSwitch(right, "مضاد بانق", function() return AUTO.AntiBang end, function(v)
				AUTO.AntiBang = v
				if v then startAntiBang() else antiBangTaskId += 1 end
			end)


			
			MakeSwitch(right, "انيميشن كاتانا", function() return AUTO.KatanaAnim end, function(v)
				AUTO.KatanaAnim = v and true or false
				if v then
					startKatanaAnim()
				else
					stopKatanaAnim()
				end
				saveAutoSettings()
			end)

			MakeSwitch(right, "حقل اوامر", function() return AUTO.CommandField end, function(v)
				AUTO.CommandField = v and true or false
				setCommandFieldVisible(AUTO.CommandField)
				saveAutoSettings()
			end)

MakeSwitch(right, "مضاد AFK",  function() return AUTO.AntiAFK end, function(v) AUTO.AntiAFK = v end)
		end
	end

	-- ====== SETTINGS UI (Scroll + حفظ زر) ======
	do
		local sf = findOrionScrollBySentinel("##SETTINGS_CONTAINER##")
		if sf and sf:IsA("ScrollingFrame") then
			sf.Active = true
			sf.ScrollingEnabled = true
			sf.ScrollBarThickness = 6
			sf.AutomaticCanvasSize = Enum.AutomaticSize.Y

			for _,ch in ipairs(sf:GetChildren()) do
				if not ch:IsA("UIListLayout") and not ch:IsA("UIPadding") then ch:Destroy() end
			end

			local list = sf:FindFirstChildOfClass("UIListLayout") or Instance.new("UIListLayout", sf)
			list.SortOrder = Enum.SortOrder.LayoutOrder
			list.Padding = UDim.new(0, 6)

			local pad = sf:FindFirstChildOfClass("UIPadding") or Instance.new("UIPadding", sf)
			pad.PaddingTop = UDim.new(0, 18)
			pad.PaddingLeft = UDim.new(0, 12)
			pad.PaddingRight = UDim.new(0, 12)
			pad.PaddingBottom = UDim.new(0, 18)

			local function centerLabel(text, h, font, size, color)
				local t = Instance.new("TextLabel")
				t.Parent = sf
				t.BackgroundTransparency = 1
				t.Size = UDim2.new(1, 0, 0, h)
				t.Font = font
				t.TextSize = size
				t.TextColor3 = color
				t.TextXAlignment = Enum.TextXAlignment.Center
				t.Text = text
				return t
			end

			centerLabel("Settings", 50, Enum.Font.GothamBold, 28, Color3.fromRGB(255,255,255))
			centerLabel("معلومات حسابي", 28, Enum.Font.GothamBold, 22, Color3.fromRGB(255,255,255))

			local createdText, daysAge = accountCreatedText(plr)
			centerLabel("تاريخ تقريبي لإنشاء الحساب: " .. createdText, 26, Enum.Font.Gotham, 18, Color3.fromRGB(220,220,220))
			centerLabel("عمر الحساب (بالأيام): " .. tostring(daysAge), 26, Enum.Font.Gotham, 18, Color3.fromRGB(220,220,220))

			centerLabel("(PC) زر فتح/إخفاء الواجهة", 20, Enum.Font.Gotham, 16, Color3.fromRGB(200,200,200))

			local holder = Instance.new("Frame")
			holder.Parent = sf
			holder.BackgroundTransparency = 1
			holder.Size = UDim2.new(1, 0, 0, 40)

			local KeyPickBtn = Instance.new("TextButton")
			KeyPickBtn.Parent = holder
			KeyPickBtn.Size = UDim2.new(0, 180, 0, 38)
			KeyPickBtn.Position = UDim2.new(0.5, -90, 0, 0)
			KeyPickBtn.BackgroundColor3 = Color3.fromRGB(25,25,25)
			KeyPickBtn.BackgroundTransparency = 0.15
			KeyPickBtn.Text = "تغيير الزر"
			KeyPickBtn.Font = Enum.Font.GothamBold
			KeyPickBtn.TextSize = 16
			KeyPickBtn.TextColor3 = Color3.fromRGB(235,235,235)
			KeyPickBtn.BorderSizePixel = 0
			round(KeyPickBtn, 12)

			local KeyValue = centerLabel(toggleKey.Name, 24, Enum.Font.GothamBold, 18, Color3.fromRGB(255,255,255))

			local waitingForKey = false
			KeyPickBtn.MouseButton1Click:Connect(function()
				if isMobile then return end
				waitingForKey = true
				KeyValue.Text = "اضغط زر..."
			end)

			UserInputService.InputBegan:Connect(function(input, gpe)
				if gpe then return end
				if waitingForKey and input.UserInputType == Enum.UserInputType.Keyboard and input.KeyCode ~= Enum.KeyCode.Unknown then
					toggleKey = input.KeyCode
					KeyValue.Text = toggleKey.Name
					waitingForKey = false
					saveSettings()
				end
			end)
		end
	end

	-- ====== Gear button opens Settings ======
	task.spawn(function()
		task.wait(0.9)
		if not orionGui then orionGui = getOrionGui("SKY") end
		if not orionGui then return end

		local profileFrame = nil
		for _,v in ipairs(orionGui:GetDescendants()) do
			if v:IsA("TextLabel") and v.Text == plr.Name then
				profileFrame = v.Parent
			end
		end
		if not profileFrame or not profileFrame:IsA("Frame") then return end

		local hit = Instance.new("TextButton")
		hit.Parent = profileFrame
		hit.BackgroundTransparency = 1
		hit.BorderSizePixel = 0
		hit.Size = UDim2.new(0, 34, 0, 34)
		hit.Position = UDim2.new(1, -40, 0.5, -17)
		hit.Text = ""
		hit.AutoButtonColor = false

		local img = Instance.new("ImageLabel")
		img.Parent = hit
		img.BackgroundTransparency = 1
		img.Size = UDim2.new(1, 0, 1, 0)
		img.Image = "rbxassetid://6031280882"
		img.ImageTransparency = 0.05

		hit.MouseButton1Click:Connect(function()
			for _,b in ipairs(orionGui:GetDescendants()) do
				if b:IsA("TextButton") and tostring(b.Text):lower():find("settings") then
					local old = b.Visible
					b.Visible = true
					task.wait(0.02)
					pcall(function() b:Activate() end)
					pcall(function() b.MouseButton1Click:Fire() end)
					task.wait(0.05)
					b.Visible = old
					break
				end
			end
		end)
	end)


	-- =====================
	-- --- COUNTER UI ---
	-- =====================

	local function formatTime(sec)
		sec = math.max(0, math.floor(sec))
		local h = math.floor(sec/3600)
		local m = math.floor((sec%3600)/60)
		local s = sec%60
		return string.format("%02d:%02d:%02d", h, m, s)
	end

	-- Notifications area (ثابتة) في الزاوية مثل أول (توست صغير)
	local NotifGui
	local NotifHolder

	-- يتأكد أن واجهة التوست/الإشعارات موجودة (وينشئها إذا ما كانت موجودة)

	local function ensureNotifGui()
		if NotifGui and NotifGui.Parent then return end
		local parent = nil
		pcall(function() parent = game:GetService('CoreGui') end)
		if not parent then parent = plr:WaitForChild('PlayerGui') end

		NotifGui = Instance.new('ScreenGui')
		NotifGui.Name = 'SKY_Counter_Notifs'
		NotifGui.ResetOnSpawn = false
		NotifGui.IgnoreGuiInset = true
		pcall(function() NotifGui.Parent = parent end)
		if not NotifGui.Parent then NotifGui.Parent = plr:WaitForChild('PlayerGui') end

		NotifHolder = Instance.new('Frame')
		NotifHolder.Parent = NotifGui
		NotifHolder.BackgroundTransparency = 1
		NotifHolder.Size = UDim2.new(0, 300, 0, 220)
		NotifHolder.AnchorPoint = Vector2.new(1,1)
		NotifHolder.Position = UDim2.new(1, -18, 1, -90) -- قريب من زر الترس

		local list = Instance.new('UIListLayout')
		list.Parent = NotifHolder
		list.SortOrder = Enum.SortOrder.LayoutOrder
		list.Padding = UDim.new(0, 10)
		list.VerticalAlignment = Enum.VerticalAlignment.Bottom

		local pad = Instance.new('UIPadding')
		pad.Parent = NotifHolder
		pad.PaddingBottom = UDim.new(0, 4)
		pad.PaddingRight  = UDim.new(0, 4)
	end

	local function tweenIn(frame)
		local TweenService = game:GetService('TweenService')
		frame.Position = frame.Position + UDim2.new(0, 60, 0, 0)
		frame.BackgroundTransparency = 1
		for _,d in ipairs(frame:GetDescendants()) do
			if d:IsA('TextLabel') or d:IsA('TextButton') then
				d.TextTransparency = 1
			end
		end
		TweenService:Create(frame, TweenInfo.new(0.25, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
			Position = frame.Position - UDim2.new(0, 60, 0, 0),
			BackgroundTransparency = 0.2,
		}):Play()
		for _,d in ipairs(frame:GetDescendants()) do
			if d:IsA('TextLabel') then
				TweenService:Create(d, TweenInfo.new(0.25), {TextTransparency = 0}):Play()
			elseif d:IsA('TextButton') then
				TweenService:Create(d, TweenInfo.new(0.25), {TextTransparency = 0}):Play()
			end
		end
	end

	-- إشعار ثابت (يحتاج زر تمام)
	local function makePersistentNotif(title, body, durationSec, showOk, userId, showSpinner)
		ensureNotifGui()
		durationSec = tonumber(durationSec) or 2
		showOk = (showOk == true)
		showSpinner = (showSpinner == true)

		local card = Instance.new('Frame')
		card.Parent = NotifHolder
		card.BackgroundColor3 = Color3.fromRGB(0,0,0)
		card.BackgroundTransparency = 0.2
		card.BorderSizePixel = 0
		card.Size = UDim2.new(1, 0, 0, showOk and 86 or 72)
		round(card, 14)

		local stroke = Instance.new('UIStroke')
		stroke.Parent = card
		stroke.Thickness = 1
		stroke.Color = Color3.fromRGB(70,70,70)
		stroke.Transparency = 0.25

		-- صورة الحساب (اختياري)
		local avatar = Instance.new("ImageLabel")
		avatar.Parent = card
		avatar.BackgroundTransparency = 1
		avatar.Size = UDim2.new(0, 34, 0, 34)
		avatar.Position = UDim2.new(0, 12, 0, 18)
		round(avatar, 999)
		avatar.Image = ""

		-- سبنر داخل الصورة (اختياري)
		local spinner = Instance.new("ImageLabel")
		spinner.Parent = avatar
		spinner.BackgroundTransparency = 1
		spinner.Size = UDim2.new(1, 0, 1, 0)
		spinner.Position = UDim2.new(0, 0, 0, 0)
		spinner.Image = "rbxassetid://1095708"
		spinner.ImageTransparency = 0.15
		spinner.Visible = false
		round(spinner, 999)

		local spinConn = nil
		local function setSpin(on)
			spinner.Visible = on
			if on then
				if spinConn then spinConn:Disconnect() end
				spinConn = RunService.RenderStepped:Connect(function(dt)
					if not spinner.Parent then
						if spinConn then spinConn:Disconnect() end
						spinConn = nil
						return
					end
					spinner.Rotation = (spinner.Rotation + (dt * 720)) % 360
				end)
			else
				spinner.Rotation = 0
				if spinConn then spinConn:Disconnect(); spinConn = nil end
			end
		end

		if userId then
			task.spawn(function()
				local ok, thumb = pcall(function()
					return Players:GetUserThumbnailAsync(tonumber(userId), Enum.ThumbnailType.HeadShot, Enum.ThumbnailSize.Size180x180)
				end)
				if ok and thumb and avatar and avatar.Parent then
					avatar.Image = thumb
				end
			end)
		end
		if showSpinner then
			setSpin(true)
		end

		local t = Instance.new('TextLabel')
		t.Parent = card
		t.BackgroundTransparency = 1
		t.Position = UDim2.new(1, -14, 0, 10)
		t.Size = UDim2.new(1, showOk and -120 or -28, 0, 22)
		t.AnchorPoint = Vector2.new(1,0)
		t.Font = Enum.Font.GothamBold
		t.TextSize = 18
		t.TextColor3 = Color3.fromRGB(255,255,255)
		t.TextXAlignment = Enum.TextXAlignment.Right
		t.Text = title

		local b = Instance.new('TextLabel')
		b.Parent = card
		b.BackgroundTransparency = 1
		b.Position = UDim2.new(1, -14, 0, 34)
		b.Size = UDim2.new(1, showOk and -120 or -28, 0, 36)
		b.AnchorPoint = Vector2.new(1,0)
		b.Font = Enum.Font.Gotham
		b.TextSize = 14
		b.TextColor3 = Color3.fromRGB(210,210,210)
		b.TextXAlignment = Enum.TextXAlignment.Right
		b.TextYAlignment = Enum.TextYAlignment.Top
		b.TextWrapped = true
		b.Text = body

		local okBtn = nil
		if showOk then
			okBtn = Instance.new('TextButton')
			okBtn.Parent = card
			okBtn.BackgroundColor3 = Color3.fromRGB(50,50,50)
			okBtn.BackgroundTransparency = 0.2
			okBtn.BorderSizePixel = 0
			okBtn.Size = UDim2.new(0, 90, 0, 34)
			okBtn.Position = UDim2.new(1, -12, 0, 26)
			okBtn.AnchorPoint = Vector2.new(1,0)
			okBtn.Font = Enum.Font.GothamBold
			okBtn.TextSize = 14
			okBtn.TextColor3 = Color3.fromRGB(255,255,255)
			okBtn.Text = "تمام"
			round(okBtn, 10)
			okBtn.AutoButtonColor = false
			okBtn.MouseButton1Click:Connect(function()
				if spinConn then spinConn:Disconnect(); spinConn = nil end
				card:Destroy()
			end)
		end

		tweenIn(card)

		if not showOk and durationSec > 0 then
			task.delay(durationSec, function()
				if spinConn then spinConn:Disconnect(); spinConn = nil end
				if card and card.Parent then card:Destroy() end
			end)
		end
	end

	local function makeAutoNotif(title, body, duration)
		ensureNotifGui()

		local card = Instance.new('Frame')
		card.Parent = NotifHolder
		card.BackgroundColor3 = Color3.fromRGB(0,0,0)
		card.BackgroundTransparency = 0.2
		card.BorderSizePixel = 0
		card.Size = UDim2.new(1, 0, 0, 72)
		round(card, 14)

		local t = Instance.new('TextLabel')
		t.Parent = card
		t.BackgroundTransparency = 1
		t.Position = UDim2.new(1, -14, 0, 14)
		t.Size = UDim2.new(1, -28, 0, 20)
		t.AnchorPoint = Vector2.new(1,0)
		t.Font = Enum.Font.GothamBold
		t.TextSize = 18
		t.TextColor3 = Color3.fromRGB(255,255,255)
		t.TextXAlignment = Enum.TextXAlignment.Right
		t.Text = title

		local b = Instance.new('TextLabel')
		b.Parent = card
		b.BackgroundTransparency = 1
		b.Position = UDim2.new(1, -14, 0, 36)
		b.Size = UDim2.new(1, -28, 0, 18)
		b.AnchorPoint = Vector2.new(1,0)
		b.Font = Enum.Font.Gotham
		b.TextSize = 14
		b.TextColor3 = Color3.fromRGB(210,210,210)
		b.TextXAlignment = Enum.TextXAlignment.Right
		b.Text = body

		tweenIn(card)
		task.delay(duration or 1.0, function()
			if card and card.Parent then card:Destroy() end
		end)
		return card
	end

	-- تم اختيار لاعب (يختفي بعد 2 ثانية)
	-- توست (تم اختيار لاعب) مع صورة اللاعب ويختفي بعد مدة

	local function makeToastSelected(username, display, userId)
		ensureNotifGui()

		local card = Instance.new('Frame')
		card.Parent = NotifHolder
		card.BackgroundColor3 = Color3.fromRGB(0,0,0)
		card.BackgroundTransparency = 0.2
		card.BorderSizePixel = 0
		card.Size = UDim2.new(1, 0, 0, 72)
		round(card, 14)

		local img = Instance.new('ImageLabel')
		img.Parent = card
		img.BackgroundTransparency = 1
		img.Size = UDim2.new(0, 46, 0, 46)
		img.Position = UDim2.new(0, 12, 0, 13)
		round(img, 999)
		pcall(function()
			img.Image = Players:GetUserThumbnailAsync(userId, Enum.ThumbnailType.HeadShot, Enum.ThumbnailSize.Size180x180)
		end)

		local t = Instance.new('TextLabel')
		t.Parent = card
		t.BackgroundTransparency = 1
		t.Position = UDim2.new(0, 70, 0, 14)
		t.Size = UDim2.new(1, -82, 0, 20)
		t.Font = Enum.Font.GothamBold
		t.TextSize = 16
		t.TextColor3 = Color3.fromRGB(255,255,255)
		t.TextXAlignment = Enum.TextXAlignment.Left
		t.Text = 'تم تحديد لاعب'

		local b = Instance.new('TextLabel')
		b.Parent = card
		b.BackgroundTransparency = 1
		b.Position = UDim2.new(0, 70, 0, 34)
		b.Size = UDim2.new(1, -82, 0, 18)
		b.Font = Enum.Font.Gotham
		b.TextSize = 14
		b.TextColor3 = Color3.fromRGB(210,210,210)
		b.TextXAlignment = Enum.TextXAlignment.Left
		b.Text = string.format("%s (%s)\nتم تفعيل عداد", display or "?", username or "?")

		tweenIn(card)
		task.delay(2.0, function()
			if card and card.Parent then card:Destroy() end
		end)
		return card
	end
	-- ====== واجهة "حقل الأوامر" (HD Admin commands) ======
	local CommandFieldGui
	local CommandFieldFrame
	local CommandFieldBox

	local function ensureCommandFieldGui()
		if CommandFieldGui and CommandFieldGui.Parent then return end
		local parent = nil
		pcall(function() parent = game:GetService("CoreGui") end)
		if not parent then parent = plr:WaitForChild("PlayerGui") end

		CommandFieldGui = Instance.new("ScreenGui")
		CommandFieldGui.Name = "SKY_CommandField"
		CommandFieldGui.ResetOnSpawn = false
		CommandFieldGui.IgnoreGuiInset = true
		CommandFieldGui.Enabled = false
		CommandFieldGui.Parent = parent

		local main = Instance.new("Frame")
		main.Name = "CommandFieldMain"
		main.Size = UDim2.new(0, 320, 0, 190)
		main.Position = UDim2.new(0.5, -160, 0.5, -95)
		main.BackgroundColor3 = Color3.fromRGB(15,15,15)
		main.BorderSizePixel = 0
		main.Parent = CommandFieldGui
		round(main, 10)
		CommandFieldFrame = main

		local header = Instance.new("TextLabel")
		header.Parent = main
		header.BackgroundColor3 = Color3.fromRGB(25,25,25)
		header.BorderSizePixel = 0
		header.Size = UDim2.new(1, 0, 0, 30)
		header.Position = UDim2.new(0, 0, 0, 0)
		header.Font = Enum.Font.GothamBold
		header.TextSize = 18
		header.TextColor3 = Color3.fromRGB(255,255,255)
		header.Text = "Wa7eed - حقل الأوامر"
		header.TextXAlignment = Enum.TextXAlignment.Center
		header.TextYAlignment = Enum.TextYAlignment.Center

		local tb = Instance.new("TextBox")
		tb.Parent = main
		tb.Size = UDim2.new(0.96, 0, 0, 32)
		tb.Position = UDim2.new(0.02, 0, 0, 45)
		tb.BackgroundColor3 = Color3.fromRGB(20,20,20)
		tb.BorderSizePixel = 0
		tb.Font = Enum.Font.Gotham
		tb.TextSize = 14
		tb.TextColor3 = Color3.fromRGB(255,255,255)
		tb.PlaceholderText = "ادخل الامر هنا..."
		tb.Text = ""
		tb.ClearTextOnFocus = false
		round(tb, 8)
		CommandFieldBox = tb

		local btnHolder = Instance.new("Frame")
		btnHolder.Parent = main
		btnHolder.BackgroundTransparency = 1
		btnHolder.Size = UDim2.new(1, -16, 0, 88)
		btnHolder.Position = UDim2.new(0, 8, 0, 85)

		local grid = Instance.new("UIGridLayout")
		grid.Parent = btnHolder
		grid.CellSize = UDim2.new(0.3, 0, 0.42, 0)
		grid.CellPadding = UDim2.new(0.05, 0, 0.12, 0)
		grid.FillDirectionMaxCells = 3
		grid.HorizontalAlignment = Enum.HorizontalAlignment.Center
		grid.VerticalAlignment = Enum.VerticalAlignment.Center

		local function makeCmdButton(txt, isExecute, callback)
			local b = Instance.new("TextButton")
			b.Parent = btnHolder
			b.Size = UDim2.new(0,0,0,0)
			b.BackgroundColor3 = isExecute and Color3.fromRGB(160,40,40) or Color3.fromRGB(40,40,100)
			b.BorderSizePixel = 0
			b.Font = Enum.Font.GothamBold
			b.TextSize = 14
			b.TextColor3 = Color3.fromRGB(255,255,255)
			b.Text = txt
			b.AutoButtonColor = true
			round(b, 8)
			b.MouseButton1Click:Connect(function()
				if callback then
					callback()
				end
			end)
			return b
		end

		local function execCurrent()
			local txt = CommandFieldBox and CommandFieldBox.Text
			if txt and txt ~= "" then
				sendHDCommand(txt)
			end
		end

		makeCmdButton("تنفيذ", true, execCurrent)
		for i = 1,7 do
			makeCmdButton("تنقل " .. i, false, function()
				local txt = CommandFieldBox and CommandFieldBox.Text
				if txt and txt ~= "" then
					sendHDCommand(txt)
				end
			end)
		end

		tb.FocusLost:Connect(function(enter)
			if enter then
				execCurrent()
			end
		end)
	end

	local function setCommandFieldVisible(on)
		if on then
			ensureCommandFieldGui()
			if CommandFieldGui then CommandFieldGui.Enabled = true end
		else
			if CommandFieldGui then CommandFieldGui.Enabled = false end
		end
	end




	-- Counter storage
	local tracked = {} -- [lowerName] = data
	local rows = {}    -- [lowerName] = rowFrame

	-- يبني واجهة صفحة العداد (Counter) داخل ##COUNTER_CONTAINER##

	local function makeCounterUI()
		local sf = findOrionScrollBySentinel('##COUNTER_CONTAINER##')
		if not (sf and sf:IsA('ScrollingFrame')) then return end

		sf.Active = true
		sf.ScrollingEnabled = true
		sf.AutomaticCanvasSize = Enum.AutomaticSize.Y

		for _,ch in ipairs(sf:GetChildren()) do
			if not ch:IsA('UIListLayout') and not ch:IsA('UIPadding') then
				ch:Destroy()
			end
		end

		local list = sf:FindFirstChildOfClass('UIListLayout') or Instance.new('UIListLayout', sf)
		list.SortOrder = Enum.SortOrder.LayoutOrder
		list.Padding = UDim.new(0, 10)

		local pad = sf:FindFirstChildOfClass('UIPadding') or Instance.new('UIPadding', sf)
		pad.PaddingTop = UDim.new(0, 12)
		pad.PaddingLeft = UDim.new(0, 12)
		pad.PaddingRight = UDim.new(0, 12)
		pad.PaddingBottom = UDim.new(0, 12)

		-- Header
		local header = Instance.new('Frame')
		header.Parent = sf
		header.BackgroundColor3 = Color3.fromRGB(0, 0, 0)
		header.BackgroundTransparency = 0.2
		header.BorderSizePixel = 0
		header.Size = UDim2.new(1, 0, 0, 96)
		round(header, 14)

		local title = Instance.new('TextLabel')
		title.Parent = header
		title.BackgroundTransparency = 1
		title.Size = UDim2.new(1, 0, 0, 34)
		title.Position = UDim2.new(0,0,0,8)
		title.Font = Enum.Font.GothamBold
		title.TextSize = 26
		title.TextColor3 = Color3.fromRGB(255,255,255)
		title.Text = 'إحتساب النقاط'
		title.TextXAlignment = Enum.TextXAlignment.Center

		local serverLbl = Instance.new('TextLabel')
		serverLbl.Parent = header
		serverLbl.BackgroundTransparency = 1
		serverLbl.Size = UDim2.new(1, 0, 0, -7)
		serverLbl.Position = UDim2.new(0,0,0,58)
		serverLbl.Font = Enum.Font.GothamBold
		serverLbl.TextSize = 18
		serverLbl.TextColor3 = Color3.fromRGB(190, 190, 190)
		serverLbl.Text = 'مدة بقائك: 00:00:00'
		serverLbl.TextXAlignment = Enum.TextXAlignment.Center

		-- Input row
		local inputRow = Instance.new('Frame')
		inputRow.Parent = sf
		inputRow.BackgroundTransparency = 1
		inputRow.Size = UDim2.new(1, 0, 0, 38)

		local box = Instance.new('TextBox')
		box.Parent = inputRow
		box.BackgroundColor3 = Color3.fromRGB(20, 20, 20)
		box.BackgroundTransparency = 0.15
		box.BorderSizePixel = 0
		box.PlaceholderText = 'اكتب اسم لاعب'
		box.Text = ''
		box.ClearTextOnFocus = false
		box.Font = Enum.Font.GothamBold
		box.TextSize = 18
		box.TextColor3 = Color3.fromRGB(235,235,235)
		box.PlaceholderColor3 = Color3.fromRGB(200,200,200)
		box.Size = UDim2.new(1, -110, 1, 0)
		box.Position = UDim2.new(0, 0, 0, -25)
		round(box, 12)

		local startBtn = Instance.new('TextButton')
		startBtn.Parent = inputRow
		startBtn.BackgroundColor3 = Color3.fromRGB(35, 35, 35)
		startBtn.BackgroundTransparency = 0.05
		startBtn.BorderSizePixel = 0
		startBtn.Size = UDim2.new(0, 96, 1, 0)
		startBtn.Position = UDim2.new(1, -96, 0, -25)
		startBtn.Font = Enum.Font.GothamBold
		startBtn.TextSize = 18
		startBtn.TextColor3 = Color3.fromRGB(255,255,255)
		startBtn.Text = 'بدء'
		round(startBtn, 12)

		-- List holder
		local listWrap = Instance.new('Frame')
		listWrap.Parent = sf
		listWrap.BackgroundColor3 = Color3.fromRGB(0, 0, 0)
		listWrap.BackgroundTransparency = 1 -- مخفي (بدون مربع كبير)
		listWrap.BorderSizePixel = 0
		listWrap.Size = UDim2.new(1, 0, 0, 300)
		round(listWrap, 14)

		local rowsSF = Instance.new('ScrollingFrame')
		rowsSF.Parent = listWrap
		rowsSF.BackgroundTransparency = 1
		rowsSF.BorderSizePixel = 0
		rowsSF.Size = UDim2.new(1, -16, 1, -16)
		rowsSF.Position = UDim2.new(0, 8, 0, -20)
		rowsSF.ScrollBarThickness = 6
		rowsSF.CanvasSize = UDim2.new(0,0,0,0)
		rowsSF.AutomaticCanvasSize = Enum.AutomaticSize.Y
		rowsSF.ScrollingDirection = Enum.ScrollingDirection.Y
		rowsSF.ScrollingEnabled = true
		rowsSF.Active = true

		local rlist = Instance.new('UIListLayout')
		rlist.Parent = rowsSF
		rlist.SortOrder = Enum.SortOrder.LayoutOrder
		rlist.Padding = UDim.new(0, 10)

		local rpad = Instance.new('UIPadding')
		rpad.Parent = rowsSF
		rpad.PaddingTop = UDim.new(0, 0)
		rpad.PaddingBottom = UDim.new(0, 4)
		rpad.PaddingLeft = UDim.new(0, 4)
		rpad.PaddingRight = UDim.new(0, 4)

		local startedAt = os.clock()
		RunService.RenderStepped:Connect(function()
			serverLbl.Text = 'مدة بقائك: ' .. formatTime(os.clock() - startedAt)
			for k,data in pairs(tracked) do
				local row = rows[k]
				if row and row.Parent then
					local sub = row:FindFirstChild('Sub')
					if sub and sub:IsA('TextLabel') then
						local dur = 0
						if data.inServer and data.startTime then
							dur = os.clock() - data.startTime
						else
							dur = data.lastDuration or 0
						end
						sub.Text = string.format('%s | دخول: %d | خروج: %d', formatTime(dur), data.joins, data.leaves)
					end
				end
			end
		end)

		local function ensureRow(data)
			local key = data.key
			if rows[key] and rows[key].Parent then return end

			local row = Instance.new('Frame')
			row.Name = 'Row_'..key
			row.Parent = rowsSF
			row.BackgroundColor3 = Color3.fromRGB(20, 20, 20)
			row.BackgroundTransparency = 0.15
			row.BorderSizePixel = 0
			row.Size = UDim2.new(1, 0, 0, 74)
			row.LayoutOrder = -(data.order or 0) -- الأحدث فوق
			round(row, 14)
			rows[key] = row

			local img = Instance.new('ImageLabel')
			img.Parent = row
			img.BackgroundTransparency = 1
			img.Size = UDim2.new(0, 54, 0, 54)
			img.Position = UDim2.new(0, 10, 0.5, -27)
			round(img, 999)
			img.Image = data.thumb or ''

			local name = Instance.new('TextLabel')
			name.Parent = row
			name.BackgroundTransparency = 1
			name.Position = UDim2.new(0, 74, 0, 10)
			name.Size = UDim2.new(1, -170, 0, 22)
			name.Font = Enum.Font.GothamBold
			name.TextSize = 18
			name.TextColor3 = Color3.fromRGB(255,255,255)
			name.TextXAlignment = Enum.TextXAlignment.Left
			name.Text = data.username

			local sub = Instance.new('TextLabel')
			sub.Name = 'Sub'
			sub.Parent = row
			sub.BackgroundTransparency = 1
			sub.Position = UDim2.new(0, 74, 0, 36)
			sub.Size = UDim2.new(1, -170, 0, 18)
			sub.Font = Enum.Font.Gotham
			sub.TextSize = 14
			sub.TextColor3 = Color3.fromRGB(210,210,210)
			sub.TextXAlignment = Enum.TextXAlignment.Left
			sub.Text = '00:00:00 | دخول: 0 | خروج: 0'

			local reset = Instance.new('TextButton')
			reset.Parent = row
			reset.Size = UDim2.new(0, 34, 0, 34)
			reset.Position = UDim2.new(1, -82, 0.5, -17)
			reset.BackgroundTransparency = 1
			reset.Font = Enum.Font.GothamBold
			reset.TextSize = 20
			reset.TextColor3 = Color3.fromRGB(255,255,255)
			reset.Text = '🔄'

			local del = Instance.new('TextButton')
			del.Parent = row
			del.Size = UDim2.new(0, 34, 0, 34)
			del.Position = UDim2.new(1, -44, 0.5, -17)
			del.BackgroundTransparency = 1
			del.Font = Enum.Font.GothamBold
			del.TextSize = 20
			del.TextColor3 = Color3.fromRGB(255,255,255)
			del.Text = '❌'

			reset.MouseButton1Click:Connect(function()
				data.joins = 0
				data.leaves = 0
				data.startTime = os.clock()
				data.inServer = false
				-- إذا موجود الآن اعتبره داخل
				for _,p in ipairs(Players:GetPlayers()) do
					if p.UserId == data.userId then
						data.inServer = true
						data.startTime = os.clock()
						break
					end
				end
			end)

			del.MouseButton1Click:Connect(function()
				tracked[key] = nil
				rows[key] = nil
				row:Destroy()
			end)
		end

		local orderCounter = 0

		local function findPlayerInServer(query)
			query = (query or ""):gsub("^%s+", ""):gsub("%s+$", "")
			if query == "" then return nil end
			local q = query:lower()
			-- 1) Exact username match (case-insensitive)
			for _,p in ipairs(Players:GetPlayers()) do
				if p.Name:lower() == q then return p end
			end
			-- 2) Exact display name match (case-insensitive)
			for _,p in ipairs(Players:GetPlayers()) do
				local dn = (p.DisplayName or "")
				if dn:lower() == q then return p end
			end
			return nil
		end

		-- يضيف لاعب للقائمة في العداد ويبدأ تتبع الوقت/الدخول/الخروج

		local function addTrackByName(name)
			name = (name or ""):gsub("^%s+", ""):gsub("%s+$","")
			if name == "" then return end

			local p = findPlayerInServer(name)
			if not p then
				makeAutoNotif("غير موجود", "اكتب اسم اللاعب كامل ولازم يكون داخل السيرفر", 1.0)
				return
			end

			local key = p.Name:lower()

			-- إذا كان موجود بالقائمة: خلّه يطلع فوق (الأحدث)
			if tracked[key] then
				orderCounter += 1
				tracked[key].order = orderCounter
				local row = rows[key]
				if row and row.Parent then
					row.LayoutOrder = -orderCounter
				end
				return
			end

			orderCounter += 1

			local thumb = ""
			pcall(function()
				thumb = Players:GetUserThumbnailAsync(p.UserId, Enum.ThumbnailType.HeadShot, Enum.ThumbnailSize.Size180x180)
			end)

			tracked[key] = {
				key = key,
				username = p.Name,
				display = p.DisplayName or p.Name,
				userId = p.UserId,
				thumb = thumb,
				joins = 0,
				leaves = 0,
				inServer = true,
				startTime = os.clock(),
				order = orderCounter,
			}

			ensureRow(tracked[key])
			local row = rows[key]
			if row and row.Parent then
				row.LayoutOrder = -orderCounter -- الأحدث فوق
			end
			-- (بدون إشعار هنا)
		end

		-- Export for Target tab
		_G.SKY_AddCounterTrack = addTrackByName

		startBtn.MouseButton1Click:Connect(function()
			addTrackByName(box.Text)
			box.Text = ''
		end)

		-- player join/leave events
		Players.PlayerAdded:Connect(function(p)
			for _,data in pairs(tracked) do
				if p.UserId == data.userId then
					data.joins += 1
					data.inServer = true
					data.startTime = os.clock() -- إعادة العداد
					data.lastDuration = 0
					-- (تم تعطيل رسائل الدخل من صفحة العداد)

					ensureRow(data)
				end
			end
		end)

		Players.PlayerRemoving:Connect(function(p)
			for _,data in pairs(tracked) do
				if p.UserId == data.userId then
					data.leaves += 1
					data.inServer = false
					local dur = 0
					if data.startTime then
						dur = os.clock() - data.startTime
					else
						dur = data.lastDuration or 0
					end
					data.lastDuration = dur
					data.startTime = nil

					-- رسالة صفحة العداد فقط عند خروج "الضحية" الحالية
					if _G.SKY_TargetUserId and p.UserId == _G.SKY_TargetUserId then
						local dn = data.display or p.DisplayName or p.Name
						local un = data.username or p.Name
						local timeStr = formatTime(dur)
						makePersistentNotif("توقف عداد عن لاعب", string.format("الاسم: %s\nاليوزر: %s\nالوقت: %s", dn, un, timeStr), 20, false, p.UserId, false)
					end

					ensureRow(data)
				end
			end
		end)
	end

	-- =====================
	-- --- TARGET UI (حسب طلب راكان) ---
	-- =====================
	-- يبني واجهة صفحة الاستهداف (Target) داخل ##TARGET_CONTAINER##

	local function makeTargetUI()
		local sf = findOrionScrollBySentinel("##TARGET_CONTAINER##")
		if not (sf and sf:IsA("ScrollingFrame")) then return end

		sf.Active = true
		sf.ScrollingEnabled = true
		sf.AutomaticCanvasSize = Enum.AutomaticSize.Y
		sf.ScrollBarThickness = 6

		for _,ch in ipairs(sf:GetChildren()) do
			if not ch:IsA("UIListLayout") and not ch:IsA("UIPadding") then
				ch:Destroy()
			end
		end

		local list = sf:FindFirstChildOfClass("UIListLayout") or Instance.new("UIListLayout", sf)
		list.SortOrder = Enum.SortOrder.LayoutOrder
		list.Padding = UDim.new(0, 12)

		local pad = sf:FindFirstChildOfClass("UIPadding") or Instance.new("UIPadding", sf)
		pad.PaddingTop = UDim.new(0, 12)
		pad.PaddingLeft = UDim.new(0, 12)
		pad.PaddingRight = UDim.new(0, 12)
		pad.PaddingBottom = UDim.new(0, 12)

		-- State
		local currentTarget = nil
		local targetUserId, targetName, targetDisplay, targetAgeDays = nil, nil, nil, nil
		local lastToolsText = ""
		local targetOffline = false
		local targetSessionStart = nil -- بداية جلسة بقاء الضحية الحالية
		local pickMode = false
		local pickConn = nil

		-- أحداث دخول/خروج الضحية (صفحة الاستهداف فقط) - اتصال واحد بدون تكرار
		if SKY_TargetConnAdd then SKY_TargetConnAdd:Disconnect(); SKY_TargetConnAdd = nil end
		if SKY_TargetConnRem then SKY_TargetConnRem:Disconnect(); SKY_TargetConnRem = nil end

		SKY_TargetConnAdd = Players.PlayerAdded:Connect(function(pl)
			if _G.SKY_TargetUserId and pl.UserId == _G.SKY_TargetUserId then
				-- رجع الهدف (دخل من جديد)
				currentTarget = pl
				targetOffline = false
				targetSessionStart = os.clock() -- جلسة جديدة
				if setOfflineVisual then pcall(function() setOfflineVisual(false) end) end
				refresh()
				-- رسالة دخل الضحية + تم إعادة تشغيل العداد
				local dn = pl.DisplayName or pl.Name
				makePersistentNotif("دخل الضحية !", string.format("اليوزر: %s\nالاسم: %s\nتم اعاده تشغيل عداد", pl.Name, dn), 0, true, pl.UserId, false)
			end
		end)

		SKY_TargetConnRem = Players.PlayerRemoving:Connect(function(pl)
			if _G.SKY_TargetUserId and pl.UserId == _G.SKY_TargetUserId then
				-- طلع الهدف
				targetOffline = true
				-- نخلي currentTarget nil عشان الأدوات ما تتحدث من لاعب غير موجود
				currentTarget = nil
				if setOfflineVisual then pcall(function() setOfflineVisual(true) end) end
				refresh()
				local dn = targetDisplay or (pl.DisplayName or pl.Name)
				local dur = 0
				if targetSessionStart then dur = os.clock() - targetSessionStart end
				targetSessionStart = nil
				makePersistentNotif("خرج الضحيه !",
					string.format("اليوزر: %s\nالاسم: %s\nبقي متصل لمدة: %s", pl.Name, dn, formatTime(dur)),
					string.format("بقي متصل لمدة: %s", formatTime(dur)),
					0,
					true,
					pl.UserId,
					false
				)
			end
		end)

		local function findPlayerInServerPrefix(query)
			query = (query or ""):gsub("^%s+",""):gsub("%s+$","")
			if query == "" then return nil end
			local q = query:lower()

			-- exact first
			for _,p in ipairs(Players:GetPlayers()) do
				if p.Name:lower() == q or ((p.DisplayName or ""):lower() == q) then
					return p
				end
			end
			-- prefix match
			for _,p in ipairs(Players:GetPlayers()) do
				if p.Name:lower():sub(1, #q) == q then
					return p
				end
			end
			for _,p in ipairs(Players:GetPlayers()) do
				local dn = (p.DisplayName or ""):lower()
				if dn:sub(1, #q) == q then
					return p
				end
			end
			return nil
		end

		local function getToolsText(p)
			local lines = {}
			local function addTools(container)
				if not container then return end
				for _,it in ipairs(container:GetChildren()) do
					if it:IsA("Tool") then
						table.insert(lines, "- " .. it.Name)
					end
				end
			end
			addTools(p:FindFirstChildOfClass("Backpack"))
			if p.Character then
				addTools(p.Character)
			end
			if #lines == 0 then
				return "لا توجد أدوات ظاهرة"
			end
			return table.concat(lines, "\n")
		end

		local SKY_PICK_HL = nil
		local function flashWhiteHighlight(char)
			-- هايلايت أبيض ثابت (أوضح من Highlight داخل الموديل)
			if not char or not char.Parent then return end
			if not SKY_PICK_HL then
				SKY_PICK_HL = Instance.new("Highlight")
				SKY_PICK_HL.Name = "SKY_TargetFlash"
				SKY_PICK_HL.FillTransparency = 1
				SKY_PICK_HL.OutlineTransparency = 0
				SKY_PICK_HL.OutlineColor = Color3.fromRGB(255,255,255)
				SKY_PICK_HL.DepthMode = Enum.HighlightDepthMode.AlwaysOnTop
				pcall(function() SKY_PICK_HL.Parent = game:GetService("CoreGui") end)
				if not SKY_PICK_HL.Parent then SKY_PICK_HL.Parent = plr:WaitForChild("PlayerGui") end
			end
			SKY_PICK_HL.Adornee = char
			SKY_PICK_HL.Enabled = true
			task.delay(2, function()
				if SKY_PICK_HL and SKY_PICK_HL.Adornee == char then
					SKY_PICK_HL.Enabled = false
					SKY_PICK_HL.Adornee = nil
				end
			end)
		end

		-- Layout wrapper: left buttons + right info
		local wrapper = Instance.new("Frame")
		wrapper.Parent = sf
		wrapper.BackgroundTransparency = 1
		wrapper.Size = UDim2.new(1, 0, 0, 460)

		local left = Instance.new("Frame")
		left.Parent = wrapper
		left.BackgroundTransparency = 1
		left.Size = UDim2.new(0.62, -10, 1, 0)

		local right = Instance.new("Frame")
		right.Parent = wrapper
		right.BackgroundTransparency = 1
		right.Size = UDim2.new(0.38, -10, 1, 0)
		right.Position = UDim2.new(0.62, 10, 0, 0)

		local lList = Instance.new("UIListLayout", left)
		lList.SortOrder = Enum.SortOrder.LayoutOrder
		lList.Padding = UDim.new(0, 10)

		-- Top row: SearchBox (ستايل العداد) + Finger
		local topRow = Instance.new("Frame")
		topRow.Parent = left
		topRow.BackgroundTransparency = 1
		topRow.Size = UDim2.new(1, 0, 0, 38)

		-- مربع بحث/إدخال اليوزر

		local searchBox = Instance.new("TextBox")
		searchBox.Parent = topRow
		searchBox.BackgroundColor3 = Color3.fromRGB(20, 20, 20)
		searchBox.BackgroundTransparency = 0.15
		searchBox.BorderSizePixel = 0
		searchBox.PlaceholderText = "اكتب اول 3 احرف"
		searchBox.Text = ""
		searchBox.ClearTextOnFocus = false
		searchBox.Font = Enum.Font.GothamBold
		searchBox.TextSize = 18
		searchBox.TextColor3 = Color3.fromRGB(235,235,235)
		searchBox.PlaceholderColor3 = Color3.fromRGB(200,200,200)
		searchBox.Size = UDim2.new(1, -60, 1, 0)
		searchBox.Position = UDim2.new(0, 0, 0, 0)
		round(searchBox, 12)

		-- زر (الاصبع) لاختيار لاعب بالضغط على جسمه (PC)

		local fingerBtn = Instance.new("TextButton")
		fingerBtn.Parent = topRow
		fingerBtn.BackgroundColor3 = Color3.fromRGB(240, 240, 240)
		fingerBtn.BackgroundTransparency = 0.05
		fingerBtn.BorderSizePixel = 0
		fingerBtn.Size = UDim2.new(0, 50, 1, 0)
		fingerBtn.Position = UDim2.new(1, -50, 0, 0)
		fingerBtn.Font = Enum.Font.GothamBold
		fingerBtn.TextSize = 18
		fingerBtn.TextColor3 = Color3.fromRGB(0,0,0)
		fingerBtn.Text = "الاصبع"
		round(fingerBtn, 12)

		-- Buttons grid (placeholders)
		-- حاوية أزرار الأوامر (Grid)

		local grid = Instance.new("Frame")
		grid.Parent = left
		grid.BackgroundTransparency = 1
		grid.Size = UDim2.new(1, 0, 0, 320)

		local gl = Instance.new("UIGridLayout", grid)
		gl.CellSize = UDim2.new(0.48, 0, 0, 42)
		gl.CellPadding = UDim2.new(0.04, 0, 0, 10)
		gl.SortOrder = Enum.SortOrder.LayoutOrder

		local function makeBtn(text, cb)
			local b = Instance.new("TextButton")
			b.Parent = grid
			b.BackgroundColor3 = Color3.fromRGB(20,20,20)
			b.BackgroundTransparency = 0.1
			b.BorderSizePixel = 0
			b.Font = Enum.Font.GothamBold
			b.TextSize = 16
			b.TextColor3 = Color3.fromRGB(255,255,255)
			b.Text = text
			round(b, 10)
			b.MouseButton1Click:Connect(function()
				if cb then task.spawn(cb) end
			end)
			return b
		end

		-- أزرار صفحة الاستهداف (Target) - إصلاح الأزرار الأساسية
		-- زر to: ينقلك قدّام اللاعب المستهدف
		local function teleportToTarget()
			if not currentTarget then return end
			local myChar = Players.LocalPlayer.Character
			local myHRP = myChar and myChar:FindFirstChild("HumanoidRootPart")
			local tChar = currentTarget.Character
			local tHRP = tChar and tChar:FindFirstChild("HumanoidRootPart")
			if not (myHRP and tHRP) then return end
			local frontPos = (tHRP.CFrame * CFrame.new(0, 0, -3)).Position
			myHRP.CFrame = CFrame.new(frontPos, tHRP.Position)
		end

		-- زر view: مشاهدة اللاعب (Toggle)
		local spectating = false
		local oldSubject = nil
		local viewBtn = nil

		local function toggleSpectate()
			if not currentTarget then return end
			local cam = workspace.CurrentCamera
			if not cam then return end

			if not spectating then
				local tHum = currentTarget.Character and currentTarget.Character:FindFirstChildOfClass("Humanoid")
				if not tHum then return end
				oldSubject = cam.CameraSubject
				cam.CameraSubject = tHum
				spectating = true
				if viewBtn then viewBtn.BackgroundColor3 = Color3.fromRGB(170,170,170) end
			else
				if oldSubject then cam.CameraSubject = oldSubject end
				spectating = false
				if viewBtn then viewBtn.BackgroundColor3 = Color3.fromRGB(20,20,20) end
			end
		end


		-- أدوات وأوامر الكلبشه (من سكربت الكلبشة الثاني)
		local lastCuffTime = 0

		local function getCuffTool()
			local player = plr
			if player.Backpack then
				for _, tool in ipairs(player.Backpack:GetChildren()) do
					if tool:IsA("Tool") then
						local name = tool.Name:lower()
						if name:find("كلبش") or name:find("angels handcuffs") then
							return tool
						end
					end
				end
			end
			if player.Character then
				for _, tool in ipairs(player.Character:GetChildren()) do
					if tool:IsA("Tool") then
						local name = tool.Name:lower()
						if name:find("كلبش") or name:find("angels handcuffs") then
							return tool
						end
					end
				end
			end
			return nil
		end

		local function cuffPlayer(targetPlayer)
			if not targetPlayer or not targetPlayer.Character then
				return false
			end

			local player = plr
			local tool = getCuffTool()
			if not tool then
				return false
			end

			-- تأكد إن اللاعب ماسك الكلبشة فعليًا
			if tool.Parent == player.Backpack then
				local char = player.Character
				if char then
					local hum = char:FindFirstChildOfClass("Humanoid")
					if hum then
						hum:EquipTool(tool)
					else
						tool.Parent = char
					end
				end
			end

			local remote = nil
			for _, obj in ipairs(tool:GetDescendants()) do
				if obj:IsA("RemoteEvent") then
					remote = obj
					break
				end
			end
			if not remote then
				return false
			end

			local char = targetPlayer.Character
			local arm =
				char:FindFirstChild("RightUpperArm") or
				char:FindFirstChild("LeftUpperArm") or
				char:FindFirstChild("Right Arm") or
				char:FindFirstChild("Left Arm")

			if not arm then
				return false
			end

			local now = tick()
			if now - lastCuffTime < 0.75 then
				return false
			end
			lastCuffTime = now

			remote:FireServer(arm)

			task.wait(0.1)
			if tool.Parent == player.Character then
				tool.Parent = player.Backpack
			end

			return true
		end


		local function cuffTarget()
			cuffPlayer(currentTarget)
		end

		local function killByCuffTarget()
			local target = currentTarget
			if not target or not target.Character then return end

			local player = plr
			local myChar = player.Character
			if not myChar then return end
			local myHRP = myChar:FindFirstChild("HumanoidRootPart")
			local tChar = target.Character
			local tHRP = tChar and tChar:FindFirstChild("HumanoidRootPart")
			if not (myHRP and tHRP) then return end

			local tool = getCuffTool()
			if not tool then return end

			-- تأكد إن الأداة في الشخصية
			if tool.Parent ~= myChar then
				tool.Parent = myChar
				task.wait()
			end

			-- ابحث عن الريموت داخل أداة الكلبشة
			local remote = nil
			for _,obj in ipairs(tool:GetDescendants()) do
				if obj:IsA("RemoteEvent") then
					remote = obj
					break
				end
			end
			if not remote then return end

			local arm =
				tChar:FindFirstChild("RightUpperArm") or
				tChar:FindFirstChild("LeftUpperArm") or
				tChar:FindFirstChild("Right Arm") or
				tChar:FindFirstChild("Left Arm")

			if not arm then return end

			local originalCF = myHRP.CFrame

			-- كلْبِش الهدف أولاً
			pcall(function()
				remote:FireServer(arm)
			end)

			task.wait(0.1)

			-- نزّل الاثنين تحت
			local downCF = CFrame.new(0, -8000, 0)
			myHRP.CFrame = downCF
			if tHRP then
				tHRP.CFrame = downCF
			end

			-- فك الكلبشة عن الضحية تحت
			task.wait(0.15)
			pcall(function()
				remote:FireServer()
			end)

			-- رجّع أداة الكلبشة للشنطة لو كانت بيدك
			if tool.Parent == myChar then
				tool.Parent = player.Backpack
			end

			-- رجّع نفسك لمكانك الأصلي، وخلي الضحية تحت
			myHRP.CFrame = originalCF
		end
		local function hangByCuffTarget()
			local target = currentTarget
			if not target or not target.Character then return end
			local username = tostring(target.Name or "")
			if username ~= "" then
				local lower = string.lower(username)
				if lower:sub(1,3) == "nan" then
					makePersistentNotif("تعليق", "ما يمكن تنفيذ تعليق على لاعب يبدأ اسمه بـ nan", 3, false, target.UserId, false)
					return
				end
			end
			-- كلبشة الهدف باستخدام نفس منطق cuffPlayer
			local ok = cuffPlayer(target)
			if not ok then return end
			local tChar = target.Character
			local tHRP = tChar and tChar:FindFirstChild("HumanoidRootPart")
			if not tHRP then return end
			local ws = workspace
			local oldFallen = ws.FallenPartsDestroyHeight
			ws.FallenPartsDestroyHeight = -1e14
			local originalCF = tHRP.CFrame
			-- نرسل الضحية بعيد فوق
			pcall(function()
				tHRP.CFrame = CFrame.new(0, 10000000, 0)
			end)
			task.wait(0.2)
			-- امر re مخفي عبر HD Admin / الشات
			if username ~= "" then
				sendHDCommand("/e .re " .. username)
			end
			task.wait(0.1)
			ws.FallenPartsDestroyHeight = oldFallen
			-- تأكد أداة الكلبشة رجعت للشنطة
			local tool = getCuffTool()
			if tool and tool.Parent == plr.Character then
				tool.Parent = plr.Backpack
			end
		end



		-- زر بانق (خلف): تتبع ورا اللاعب + محاولة تشغيل رقصة
		local bangOn = false
		local antiCuffFromBang = false
		local bangConn = nil
		local bangTrack = nil
		local bangAnim = Instance.new("Animation")
		bangAnim.AnimationId = "rbxassetid://138440659403841"
		local strongBangOn = false
		local strongBangBtn = nil
		local strongBangToggleId = 0
		local strongBangFront = false


		-- ===== Bang (v2 - مطوّر): يلتصق ويعيد المحاولة لو الهدف طلع ورجع =====
		local animIdR6 = "148840371"
		local animIdR15 = "5918726674"
		local bangMaxForce = 9e12
		local bangMonitorInterval = 0.12

		local bangTrack = nil
		local bangDesired = false
		local bangAttached = false
		local bangTargetName = nil
		local bangSavedCanCollide = {}

		local function destroyBangObjects(root)
			if not root then return end
			for _,obj in pairs(root:GetChildren()) do
				if obj.Name=="BangAlignPosition" or obj.Name=="BangAlignOrientation" or obj.Name=="BangAttachment" then
					pcall(function() obj:Destroy() end)
				end
			end
		end

		local function stopBangAnim()
			if bangTrack then pcall(function() bangTrack:Stop(0) end) end
			bangTrack = nil
		end

		local function playBangAnim()
			stopBangAnim()
			local ch = Players.LocalPlayer.Character
			local hum = ch and ch:FindFirstChildOfClass("Humanoid")
			if not hum then return end
			local animator = hum:FindFirstChildOfClass("Animator") or Instance.new("Animator", hum)
			local anim = Instance.new("Animation")
			local id = (hum.RigType==Enum.HumanoidRigType.R6) and animIdR6 or animIdR15
			anim.AnimationId = "rbxassetid://"..id
			local ok, track = pcall(function() return animator:LoadAnimation(anim) end)
			if not ok or not track then return end
			bangTrack = track
			bangTrack.Looped = true
			pcall(function() bangTrack:Play(0.05, 1, 1) end)
			-- سرعة البانق قويّة (ثابتة 9999)
			pcall(function() bangTrack:AdjustSpeed(9999) end)
		end

		local function disableLocalCollisions()
			local ch = Players.LocalPlayer.Character
			if not ch then return end
			for _,part in pairs(ch:GetDescendants()) do
				if part:IsA("BasePart") then
					if bangSavedCanCollide[part] == nil then
						bangSavedCanCollide[part] = part.CanCollide
					end
					part.CanCollide = false
				end
			end
		end

		local function restoreLocalCollisions()
			for part,old in pairs(bangSavedCanCollide) do
				if part and part.Parent and part:IsA("BasePart") then
					pcall(function() part.CanCollide = old end)
				end
			end
			table.clear(bangSavedCanCollide)
		end

		local function safeCreateBangAttach(rootMe, rootTarget)
			if not rootMe or not rootTarget then return false end
			destroyBangObjects(rootMe)
			-- نظف القديم من الهدف عشان ما تتكدس Attachments
			pcall(function()
				local old = rootTarget:FindFirstChild("BangTargetAttachment")
				if old then old:Destroy() end
			end)

			local a0 = Instance.new("Attachment")
			a0.Name = "BangAttachment"
			a0.Parent = rootMe

			local a1 = Instance.new("Attachment")
			a1.Name = "BangTargetAttachment"
			a1.Parent = rootTarget
			a1.Position = Vector3.new(0,0,1)

			local ap = Instance.new("AlignPosition")
			ap.Name = "BangAlignPosition"
			ap.Parent = rootMe
			ap.Attachment0 = a0
			ap.Attachment1 = a1
			ap.MaxForce = bangMaxForce
			ap.Responsiveness = 500
			ap.ReactionForceEnabled = false

			local ao = Instance.new("AlignOrientation")
			ao.Name = "BangAlignOrientation"
			ao.Parent = rootMe
			ao.Attachment0 = a0
			ao.Attachment1 = a1
			ao.MaxTorque = bangMaxForce
			ao.Responsiveness = 500
			ao.ReactionTorqueEnabled = false

			return true
		end

		local function attachToTarget(plr)
			if not plr or plr==Players.LocalPlayer then return end
			if not plr.Character then return end
			local myChar = Players.LocalPlayer.Character
			if not myChar then return end

			local rootMe = myChar:FindFirstChild("HumanoidRootPart")
			local rootTarget = plr.Character:FindFirstChild("HumanoidRootPart")
			if not rootMe or not rootTarget then return end

			disableLocalCollisions()
			safeCreateBangAttach(rootMe, rootTarget)
			playBangAnim()
			bangAttached = true
		end

		local function detachBang()
			local myChar = Players.LocalPlayer.Character
			local rootMe = myChar and myChar:FindFirstChild("HumanoidRootPart")
			if rootMe then
				destroyBangObjects(rootMe)
			end
			stopBangAnim()
			restoreLocalCollisions()
			bangAttached = false
		end

		-- Loop ثابت: يعيد المحاولة لو الهدف طلع ورجع أو ضاعت الـ Attachments
		task.spawn(function()
			while true do
				if bangDesired and bangTargetName and bangTargetName ~= "" then
					local target = Players:FindFirstChild(bangTargetName)
					if target and target.Parent and target.Character and Players.LocalPlayer.Character then
						local myRoot = Players.LocalPlayer.Character:FindFirstChild("HumanoidRootPart")
						local theirRoot = target.Character:FindFirstChild("HumanoidRootPart")
						if myRoot and theirRoot then
							if not bangAttached then
								pcall(function() attachToTarget(target) end)
							else
								local okAttach = myRoot:FindFirstChild("BangAttachment") ~= nil
								if not okAttach then
									bangAttached = false
									pcall(function() attachToTarget(target) end)
								end
							end
						else
							bangAttached = false
						end
					else
						bangAttached = false
					end
				end
				task.wait(bangMonitorInterval)
			end
		end)

		local function stopBang()
			-- Bang v2: يوقف الانيميشن + يفك الالتصاق + يرجّع التصادم
			bangOn = false
			bangDesired = false
			bangTargetName = nil
			detachBang()
		end

		local function startBang()
			-- Bang v2: لازم Target
			if not currentTarget then return end
			bangOn = true
			bangDesired = true
			bangTargetName = currentTarget.Name
			bangAttached = false
			pcall(function() attachToTarget(currentTarget) end)
		end

		-- زر بانق أمام (جلوس + ذبذبة)
		local frontBangOn = false
		local frontBangConn = nil
		local function stopFrontBang()
			frontBangOn = false
			if frontBangConn then frontBangConn:Disconnect(); frontBangConn = nil end
			local ch = Players.LocalPlayer.Character
			local hum = ch and ch:FindFirstChildOfClass("Humanoid")
			if hum then hum.Sit = false end
		end

		local function startFrontBang()
			if not currentTarget then return end
			local myChar = Players.LocalPlayer.Character
			local myHRP = myChar and myChar:FindFirstChild("HumanoidRootPart")
			local myHum = myChar and myChar:FindFirstChildOfClass("Humanoid")
			local tChar = currentTarget.Character
			local tHRP = tChar and tChar:FindFirstChild("HumanoidRootPart")
			if not (myHRP and myHum and tHRP) then return end

			local frontDist = 1.1
			local wobbleAmp = 1.25
			local wobbleHz  = 35
			myHum.Sit = true

			frontBangConn = RunService.Heartbeat:Connect(function()
				if not frontBangOn then return end
				local mc = Players.LocalPlayer.Character
				local hrp = mc and mc:FindFirstChild("HumanoidRootPart")
				local hum = mc and mc:FindFirstChildOfClass("Humanoid")
				local tc = currentTarget and currentTarget.Character
				local thrp = tc and tc:FindFirstChild("HumanoidRootPart")
				if not (hrp and hum and thrp) then return end
				hum.Sit = true

				-- المكان (فوق + قدّام)
				local baseCF = thrp.CFrame * CFrame.new(0, 1.5, -frontDist)

				-- الاهتزاز
				local wob = math.sin(os.clock() * (math.pi * 1) * wobbleHz) * wobbleAmp
				if wob > 0 then
					wob = wob * 0.25
				else
					wob = wob * 1.8
				end

				local wobCF = baseCF * CFrame.new(0, 0, wob)
				local pos = wobCF.Position

				-- نخلي الاتجاه أفقي فقط (نلغي فرق الارتفاع)
				local lookPos = Vector3.new(thrp.Position.X, pos.Y, thrp.Position.Z)

				hrp.CFrame = CFrame.new(pos, lookPos)
			end)
		end

		-- إنشاء الأزرار الأساسية
		local toBtn = makeBtn("to", function() teleportToTarget() end)
		viewBtn = makeBtn("view", function() toggleSpectate() end)
		viewBtn.BackgroundColor3 = Color3.fromRGB(20,20,20)
		viewBtn.AutoButtonColor = false

		-- زر "كلبشه" بنفس ستايل زر to ويستخدم ميزة الكلبشة الأصلية
		local cuffBtn = makeBtn("كلبشه", function()
			cuffTarget()
		end)

		local killCuffBtn = makeBtn("قتل بالكلبشه", function()
			killByCuffTarget()
		end)

		local hangBtn = makeBtn("تعليق", function()
			hangByCuffTarget()
		end)

		local bangBtn = makeBtn("بانق", function()
			-- إلغاء وضع بانق قوي إذا شغّلت بانق العادي
			if strongBangOn then
				strongBangOn = false
				if strongBangBtn then
					strongBangBtn.BackgroundColor3 = Color3.fromRGB(20,20,20)
				end
			end

			bangOn = not bangOn
			if bangOn then
				if frontBangOn then frontBangOn = false; stopFrontBang() end
				-- تشغيل مضاد الكلبشة إذا مو شغّال أساساً
				if not AUTO.AntiCuff then
					startAntiCuff()
					antiCuffFromBang = true
				end
				startBang()
				bangBtn.BackgroundColor3 = Color3.fromRGB(170,170,170)
			else
				stopBang()
				-- لو ولا نوع من أنواع البانق شغّال، نطفي المضاد اللي شغّلناه من هنا
				if antiCuffFromBang and (not bangOn and not frontBangOn and not strongBangOn) then
					stopAntiCuff()
					antiCuffFromBang = false
				end
				bangBtn.BackgroundColor3 = Color3.fromRGB(20,20,20)
			end
		end)
		bangBtn.AutoButtonColor = false
		bangBtn.BackgroundColor3 = Color3.fromRGB(20,20,20)

				local frontBangBtn = makeBtn("بانق أمام", function()
			-- إلغاء وضع بانق قوي إذا شغّلت بانق الأمامي
			if strongBangOn then
				strongBangOn = false
				if strongBangBtn then
					strongBangBtn.BackgroundColor3 = Color3.fromRGB(20,20,20)
				end
			end

			frontBangOn = not frontBangOn
			if frontBangOn then
				if bangOn then bangOn = false; stopBang(); bangBtn.BackgroundColor3 = Color3.fromRGB(20,20,20) end
				-- تشغيل مضاد الكلبشة إذا مو شغّال أساساً
				if not AUTO.AntiCuff then
					startAntiCuff()
					antiCuffFromBang = true
				end
				startFrontBang()
				frontBangBtn.BackgroundColor3 = Color3.fromRGB(170,170,170)
			else
				stopFrontBang()
				if antiCuffFromBang and (not bangOn and not frontBangOn and not strongBangOn) then
					stopAntiCuff()
					antiCuffFromBang = false
				end
				frontBangBtn.BackgroundColor3 = Color3.fromRGB(20,20,20)
			end
		end)
		frontBangBtn.AutoButtonColor = false
		frontBangBtn.BackgroundColor3 = Color3.fromRGB(20,20,20)
		-- زر "بانق قوي": ينتقل كل نص ثانية بين بانق (خلف - جالس) ومص (قدّام - واقف)
		strongBangBtn = makeBtn("بانق قوي", function()
			strongBangOn = not strongBangOn
			if strongBangOn then
				-- طفي أوضاع البانق الأخرى أولاً
				if bangOn then
					bangOn = false
					stopBang()
					bangBtn.BackgroundColor3 = Color3.fromRGB(20,20,20)
				end
				if frontBangOn then
					frontBangOn = false
					stopFrontBang()
					frontBangBtn.BackgroundColor3 = Color3.fromRGB(20,20,20)
				end

				strongBangBtn.BackgroundColor3 = Color3.fromRGB(170,170,170)

				-- بدء بانق عادي (خلف) + تفعيل اللوب الخاص بالتبديل
				if not currentTarget then return end
				bangOn = true
				bangDesired = true
				bangTargetName = currentTarget.Name
				bangAttached = false
				pcall(function() attachToTarget(currentTarget) end)

				strongBangToggleId += 1
				local myId = strongBangToggleId
				strongBangFront = false

				task.spawn(function()
					while strongBangOn and myId == strongBangToggleId do
						local ch = Players.LocalPlayer.Character
						local hum = ch and ch:FindFirstChildOfClass("Humanoid")
						local rootMe = ch and ch:FindFirstChild("HumanoidRootPart")
						local target = currentTarget
						local tChar = target and target.Character
						local rootTarget = tChar and tChar:FindFirstChild("HumanoidRootPart")
						local a1 = rootTarget and rootTarget:FindFirstChild("BangTargetAttachment")
						if not (hum and rootMe and rootTarget and a1) then
							break
						end

						-- تبديل بين الوضعين: خلف (بانق) وقدّام (مص)
						strongBangFront = not strongBangFront

						if strongBangFront then
							-- قدّام الهدف - واقف
							pcall(function()
								hum.Sit = false
								a1.Position = Vector3.new(0, 0, -0.5)
							end)
						else
							-- خلف الهدف - جالس
							pcall(function()
								hum.Sit = true
								a1.Position = Vector3.new(0, 0, 1)
							end)
						end

						-- سرعة عالية للانيميشن (نفس نظام بانق)
						pcall(function()
							if bangTrack then bangTrack:AdjustSpeed(9999) end
						end)

						-- كل نص ثانية تقريباً
						task.wait(0.01)
					end
				end)
			else
				-- إيقاف وضع بانق قوي فقط (يرجع البانق لوضع الإيقاف)
				strongBangToggleId += 1
				strongBangFront = false
				bangOn = false
				stopBang()
				if bangBtn then bangBtn.BackgroundColor3 = Color3.fromRGB(20,20,20) end
				if frontBangBtn then frontBangBtn.BackgroundColor3 = Color3.fromRGB(20,20,20) end
				strongBangBtn.BackgroundColor3 = Color3.fromRGB(20,20,20)
			end
		end)
strongBangBtn.AutoButtonColor = false
		strongBangBtn.BackgroundColor3 = Color3.fromRGB(20,20,20)

		




		-- Right panel (معلومات + خط + أدوات)
		-- كرت معلومات اللاعب (يمين) أو كرت لاعب داخل القائمة

		local card = Instance.new("Frame")
		card.Parent = right
		card.BackgroundColor3 = Color3.fromRGB(0,0,0)
		card.BackgroundTransparency = 0.2
		card.BorderSizePixel = 0
		card.Size = UDim2.new(1, 0, 0, 460)
		round(card, 14)

		-- صورة اللاعب (Thumbnail)

		local avatar = Instance.new("ImageLabel")
		avatar.Parent = card
		avatar.BackgroundTransparency = 1
		avatar.Size = UDim2.new(0, 128, 0, 128)
		avatar.Position = UDim2.new(0.5, -64, 0, -5)
		round(avatar, 999)
		local setOfflineVisual = nil

		-- Overlay داخل صورة الحساب عند خروج الضحية (نص + دوران)
		local avatarOverlay = Instance.new("Frame")
		avatarOverlay.Parent = card
		avatarOverlay.BackgroundTransparency = 1
		avatarOverlay.Size = avatar.Size
		avatarOverlay.Position = avatar.Position
		avatarOverlay.Visible = false

		local overlayTxt = Instance.new("TextLabel")
		overlayTxt.Parent = avatarOverlay
		overlayTxt.BackgroundTransparency = 1
		overlayTxt.Size = UDim2.new(1, 0, 0, 24)
		overlayTxt.Position = UDim2.new(0, 0, 1, -26)
		overlayTxt.Font = Enum.Font.GothamBold
		overlayTxt.TextSize = 14
		overlayTxt.TextColor3 = Color3.fromRGB(255,255,255)
		overlayTxt.TextStrokeTransparency = 0.4
		overlayTxt.TextXAlignment = Enum.TextXAlignment.Center
		overlayTxt.Text = "طلع الضحيه! 👋"

		local spinner = Instance.new("ImageLabel")
		spinner.Parent = avatarOverlay
		spinner.BackgroundTransparency = 1
		spinner.Size = UDim2.new(0, 34, 0, 34)
		spinner.Position = UDim2.new(0.5, -17, 0.5, -22)
		spinner.Image = "rbxassetid://1095708"
		spinner.ImageTransparency = 0.15
		round(spinner, 999)

		local spinnerConn = nil
		function setOfflineVisual(on)
			if on then
				avatar.ImageTransparency = 0.5
				avatarOverlay.Visible = true
				if not spinnerConn then
					spinnerConn = RunService.RenderStepped:Connect(function(dt)
						if not spinner.Parent then
							if spinnerConn then spinnerConn:Disconnect() end
							spinnerConn = nil
							return
						end
						spinner.Rotation = (spinner.Rotation + (dt * 720)) % 360
					end)
				end
			else
				avatar.ImageTransparency = 0
				avatarOverlay.Visible = false
				spinner.Rotation = 0
				if spinnerConn then spinnerConn:Disconnect(); spinnerConn = nil end
			end
		end

		-- نص معلومات اللاعب (اسم/يوزر/عمر الحساب)

		local info = Instance.new("TextLabel")
		info.Parent = card
		info.BackgroundTransparency = 1
		info.Position = UDim2.new(0, 16, 0, 132)
		info.Size = UDim2.new(1, -32, 0, 92)
		info.Font = Enum.Font.GothamBold
		info.TextSize = 14
		info.TextColor3 = Color3.fromRGB(235,235,235)
		info.TextXAlignment = Enum.TextXAlignment.Right
		info.TextYAlignment = Enum.TextYAlignment.Top
		info.TextWrapped = true
		info.Text = "اختر لاعب"

		-- خط فاصل بين المعلومات والأدوات

		local sep = Instance.new("Frame")
		sep.Parent = card
		sep.BackgroundColor3 = Color3.fromRGB(255,255,255)
		sep.BackgroundTransparency = 0.75
		sep.BorderSizePixel = 0
		sep.Position = UDim2.new(0, 16, 0, 185)
		sep.Size = UDim2.new(1, -32, 0, 1)

		-- نص الأدوات (Tools) اللي مع اللاعب

		local toolsLbl = Instance.new("TextLabel")
		toolsLbl.Parent = card
		toolsLbl.BackgroundTransparency = 1
		toolsLbl.Position = UDim2.new(0, 16, 0, 190)
		toolsLbl.Size = UDim2.new(1, -32, 0, 180)
		toolsLbl.Font = Enum.Font.Gotham
		toolsLbl.TextSize = 13
		toolsLbl.TextColor3 = Color3.fromRGB(200,200,200)
		toolsLbl.TextXAlignment = Enum.TextXAlignment.Right
		toolsLbl.TextYAlignment = Enum.TextYAlignment.Top
		toolsLbl.TextWrapped = true
		toolsLbl.Text = ""

		local setPickMode = nil
		local refresh = nil
		refresh = function()
			local p = currentTarget
			-- إذا ما فيه هدف لكن هو هدفنا وطلع: لا نمسح صورته/معلوماته
			if not p then
				if targetUserId and targetOffline then
					-- حافظ على الصورة الحالية + خلي النص ثابت
					local dn = targetDisplay or targetName or "?"
					local un = targetName or "?"
					local age = tonumber(targetAgeDays) or 0
					info.Text = string.format("الاسم: %s\nاليوزر: %s\nعمر الحساب: %s يوم", dn, un, tostring(age))
					toolsLbl.Text = lastToolsText ~= "" and lastToolsText or "لا توجد أدوات ظاهرة"
					return
				end
				avatar.Image = ""
				info.Text = "اختر لاعب"
				toolsLbl.Text = ""
				if setOfflineVisual then pcall(function() setOfflineVisual(false) end) end
				return
			end

			targetUserId = p.UserId
			_G.SKY_TargetUserId = targetUserId
			targetName = p.Name
			targetDisplay = p.DisplayName or p.Name
			targetAgeDays = tonumber(p.AccountAge) or 0

			local ok, thumb = pcall(function()
				return Players:GetUserThumbnailAsync(p.UserId, Enum.ThumbnailType.HeadShot, Enum.ThumbnailSize.Size180x180)
			end)
			if ok and thumb then
				avatar.Image = thumb
			end

			info.Text = string.format("الاسم: %s\nاليوزر: %s\nعمر الحساب: %s يوم", targetDisplay, targetName, tostring(targetAgeDays))

			lastToolsText = getToolsText(p)
			toolsLbl.Text = lastToolsText

			-- لو كان خارج، رجعه طبيعي
			if targetOffline then
				targetOffline = false
				if setOfflineVisual then pcall(function() setOfflineVisual(false) end) end
			end
		end

		local function applySelection(p, fromFinger)
			currentTarget = p
			targetUserId = p and p.UserId or nil
			_G.SKY_TargetUserId = targetUserId
			targetName = p and p.Name or nil
			targetDisplay = p and (p.DisplayName or p.Name) or nil
			targetAgeDays = p and (tonumber(p.AccountAge) or 0) or 0
			targetOffline = false
			if setOfflineVisual then pcall(function() setOfflineVisual(false) end) end
			-- ابدأ العداد من جديد عند اختيار لاعب
			targetSessionStart = os.clock()

			refresh()

			-- شغّل/أعد تشغيل العداد (بدون رسائل إضافية)
			if _G.SKY_AddCounterTrack then
				_G.SKY_AddCounterTrack(p.Name)
			end

			-- هايلايت أبيض لمدة ثانيتين
			if fromFinger and p.Character then
				flashWhiteHighlight(p.Character)
			end

			-- رسالة واحدة فقط: تم تحديد لاعب + تم تفعيل عداد
			-- (بدون إشعار هنا)
			-- لو الاختيار كان من الاصبع: قفل وضع الاصبع تلقائيًا
			if fromFinger and setPickMode then
				pcall(function() setPickMode(false) end)
			end
		end

		-- كتابة (Enter)
		searchBox.FocusLost:Connect(function(enterPressed)
			if not enterPressed then return end
			local p = findPlayerInServerPrefix(searchBox.Text)
			if not p then
				makeAutoNotif("غير موجود", "تأكد من الاسم/اول 3 احرف + يكون داخل السيرفر", 1.0)
				return
			end
			searchBox.Text = ""
			applySelection(p, false)
		end)

		-- الاصبع
		setPickMode = function(v)
			pickMode = v and true or false

			-- تحديث لون زر الاصبع (ابيض = مطفي، اخضر = شغال)
			pcall(function()
				if fingerBtn then
					if pickMode then
						fingerBtn.BackgroundColor3 = Color3.fromRGB(80, 200, 120)
						fingerBtn.TextColor3 = Color3.fromRGB(255,255,255)
					else
						fingerBtn.BackgroundColor3 = Color3.fromRGB(240, 240, 240)
						fingerBtn.TextColor3 = Color3.fromRGB(0,0,0)
					end
				end
			end)

			if not UserInputService.KeyboardEnabled then
				pickMode = false
			end

			if pickConn then
				pickConn:Disconnect()
				pickConn = nil
			end

			if pickMode then
				pickConn = UserInputService.InputBegan:Connect(function(input, gpe)
					if gpe then return end
					if input.UserInputType ~= Enum.UserInputType.MouseButton1 then return end
					if not pickMode then return end

					local mouse = Players.LocalPlayer:GetMouse()
					local hit = mouse and mouse.Target
					if not hit then return end

					local model = hit:FindFirstAncestorOfClass("Model")
					if not model then return end

					local p = Players:GetPlayerFromCharacter(model)
					if p then
						setPickMode(false)
						applySelection(p, true)
					end
				end)
			end
		end

		fingerBtn.MouseButton1Click:Connect(function()
			if not UserInputService.KeyboardEnabled then
				makeAutoNotif("غير متاح", "ميزة الاصبع للـPC فقط", 1.5)
				return
			end

			setPickMode(not pickMode)
			if pickMode then
				fingerBtn.Text = "اختر..."
				fingerBtn.BackgroundColor3 = Color3.fromRGB(90, 200, 90)
				makeAutoNotif("تحديد", "اضغط على جسم اللاعب", 2.0)
			else
				fingerBtn.Text = "الاصبع"
				fingerBtn.BackgroundColor3 = Color3.fromRGB(240, 240, 240)
			end
		end)

		task.spawn(function()
			while sf and sf.Parent do
				if currentTarget and (not Players:FindFirstChild(currentTarget.Name)) then
					currentTarget = nil
				end
				refresh()
				task.wait(1.0)
			end
		end)

		refresh()
	end

	makeCounterUI()
	makeTargetUI()


end
